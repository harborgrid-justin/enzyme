# Configuration Providers

React context providers for configuration management in @missionfabric-js/enzyme.

**Locations**:
- `/home/user/enzyme/src/config/ConfigProvider.tsx` - Main provider
- `/home/user/enzyme/src/config/config-context.tsx` - Context definition
- `/home/user/enzyme/src/config/with-config.tsx` - HOC wrapper

## Table of Contents

- [ConfigProvider](#configprovider)
- [Context API](#context-api)
- [HOC Pattern](#hoc-pattern)
- [Helper Components](#helper-components)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)

## ConfigProvider

Primary React context provider for configuration.

### Basic Usage

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

### Props

```typescript
interface ConfigProviderProps {
  /** Initial configuration */
  config?: Record<ConfigNamespace, ConfigRecord>;

  /** Enable dynamic configuration */
  enableDynamic?: boolean;

  /** Dynamic configuration options */
  dynamicOptions?: DynamicConfigOptions;

  /** Validation schemas */
  schemas?: Record<ConfigNamespace, z.ZodSchema>;

  /** Children to render */
  children: React.ReactNode;
}
```

### With Dynamic Configuration

```tsx
import { ConfigProvider } from '@/config';

function App() {
  return (
    <ConfigProvider
      enableDynamic={true}
      dynamicOptions={{
        pollingInterval: 60000,
        enableWebSocket: true,
        cacheDuration: 300000
      }}
    >
      <YourApp />
    </ConfigProvider>
  );
}
```

### With Validation Schemas

```tsx
import { ConfigProvider } from '@/config';
import { z } from 'zod';

const schemas = {
  ui: z.object({
    theme: z.enum(['light', 'dark']),
    language: z.string()
  }),
  features: z.object({
    beta: z.boolean()
  })
};

function App() {
  return (
    <ConfigProvider schemas={schemas}>
      <YourApp />
    </ConfigProvider>
  );
}
```

### Async Initialization

```tsx
import { ConfigProvider } from '@/config';
import { Suspense } from 'react';

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ConfigProvider
        enableDynamic={true}
        config={async () => {
          // Load configuration asynchronously
          const config = await fetchRemoteConfig();
          return config;
        }}
      >
        <YourApp />
      </ConfigProvider>
    </Suspense>
  );
}
```

## Context API

### useConfigContext

Access the configuration context:

```tsx
import { useConfigContext } from '@/config';

function MyComponent() {
  const context = useConfigContext();

  if (!context) {
    throw new Error('Must be used within ConfigProvider');
  }

  return (
    <div>
      <div>Initialized: {context.initialized ? 'Yes' : 'No'}</div>
      <button onClick={context.refresh}>Refresh Config</button>
    </div>
  );
}
```

### Context Value

```typescript
interface ConfigContextValue {
  /** Configuration registry */
  registry: ConfigRegistry;

  /** Dynamic configuration manager */
  dynamicConfig?: DynamicConfigManager;

  /** Initialization state */
  initialized: boolean;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: Error | null;

  /** Refresh configuration */
  refresh: () => Promise<void>;

  /** Validate configuration */
  validate: () => boolean;
}
```

### Direct Context Access

```tsx
import { ConfigContext } from '@/config';
import { useContext } from 'react';

function MyComponent() {
  const config = useContext(ConfigContext);

  // Use context value
  return <div>Theme: {config.registry.get('ui', 'theme')}</div>;
}
```

## HOC Pattern

### withConfig

Higher-Order Component for configuration injection:

```tsx
import { withConfig } from '@/config';

interface Props {
  config?: ConfigContextValue;
}

function MyComponent({ config }: Props) {
  return (
    <div>
      <div>Theme: {config.registry.get('ui', 'theme')}</div>
    </div>
  );
}

export default withConfig(MyComponent);
```

### With Options

```tsx
import { withConfig } from '@/config';

interface Props {
  appConfig?: {
    theme: string;
    language: string;
  };
}

const Enhanced = withConfig<Props>(MyComponent, {
  // Map config to props
  mapConfigToProps: (context) => ({
    appConfig: {
      theme: context.registry.get('ui', 'theme'),
      language: context.registry.get('ui', 'language')
    }
  }),

  // Display name
  displayName: 'ConfiguredComponent'
});
```

## Helper Components

### ConfigReady

Conditional rendering based on initialization:

```tsx
import { ConfigReady } from '@/config';

function App() {
  return (
    <ConfigProvider enableDynamic>
      <ConfigReady fallback={<Loading />}>
        <YourApp />
      </ConfigReady>
    </ConfigProvider>
  );
}
```

### FeatureFlag

Declarative feature flag rendering:

```tsx
import { FeatureFlag } from '@/config';

function Dashboard() {
  return (
    <div>
      <FeatureFlag flag="analytics">
        <Analytics />
      </FeatureFlag>

      <FeatureFlag flag="reports" fallback={<ComingSoon />}>
        <Reports />
      </FeatureFlag>
    </div>
  );
}
```

### ABTest

A/B testing component:

```tsx
import { ABTest } from '@/config';

function CheckoutFlow() {
  return (
    <ABTest
      testId="checkout-experiment"
      userId={currentUser.id}
      variants={{
        control: <StandardCheckout />,
        'variant-a': <OptimizedCheckout />,
        'variant-b': <ExpressCheckout />
      }}
    />
  );
}
```

## Usage Patterns

### Multi-Level Configuration

```tsx
function App() {
  return (
    <ConfigProvider config={globalConfig}>
      <GlobalApp />

      {/* Override for specific section */}
      <ConfigProvider config={adminConfig}>
        <AdminPanel />
      </ConfigProvider>
    </ConfigProvider>
  );
}
```

### Environment-Specific Provider

```tsx
import { env } from '@/config';

function App() {
  const config = useMemo(() => ({
    app: {
      debug: env.isDev,
      version: env.appVersion
    },
    api: {
      baseUrl: env.apiBaseUrl,
      timeout: env.apiTimeout
    }
  }), []);

  return (
    <ConfigProvider config={config}>
      <YourApp />
    </ConfigProvider>
  );
}
```

### Lazy Configuration Loading

```tsx
function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      const remoteConfig = await fetchConfig();
      setConfig(remoteConfig);
      setLoading(false);
    }
    loadConfig();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <ConfigProvider config={config}>
      <YourApp />
    </ConfigProvider>
  );
}
```

### Context-Aware Configuration

```tsx
function UserAwareProvider({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();

  const config = useMemo(() => ({
    user: {
      id: user?.id,
      role: user?.role,
      preferences: user?.preferences
    },
    features: {
      premium: user?.subscription === 'premium'
    }
  }), [user]);

  return (
    <ConfigProvider config={config}>
      {children}
    </ConfigProvider>
  );
}
```

### Validated Provider

```tsx
import { z } from 'zod';

const configSchema = {
  ui: z.object({
    theme: z.enum(['light', 'dark']),
    language: z.string()
  })
};

function App() {
  return (
    <ConfigProvider
      config={initialConfig}
      schemas={configSchema}
    >
      <ConfigReady
        fallback={<ConfigError />}
        errorBoundary={<ConfigErrorBoundary />}
      >
        <YourApp />
      </ConfigReady>
    </ConfigProvider>
  );
}
```

## Best Practices

### 1. Single Provider at Root

```tsx
// Good: One provider at app root
function App() {
  return (
    <ConfigProvider config={config}>
      <Router>
        <Routes />
      </Router>
    </ConfigProvider>
  );
}

// Bad: Multiple competing providers
function App() {
  return (
    <ConfigProvider config={config1}>
      <ConfigProvider config={config2}>
        <App />
      </ConfigProvider>
    </ConfigProvider>
  );
}
```

### 2. Initialize Early

```tsx
// main.tsx
import { initializeConfig } from '@/config';

// Validate and initialize before rendering
initializeConfig();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider enableDynamic>
    <App />
  </ConfigProvider>
);
```

### 3. Use Memoization

```tsx
function App() {
  const config = useMemo(() => ({
    app: { theme: 'dark' },
    features: { beta: true }
  }), []); // Empty deps = config never changes

  return (
    <ConfigProvider config={config}>
      <YourApp />
    </ConfigProvider>
  );
}
```

### 4. Handle Loading States

```tsx
function App() {
  return (
    <ConfigProvider enableDynamic>
      <ConfigReady fallback={<Spinner />}>
        <YourApp />
      </ConfigReady>
    </ConfigProvider>
  );
}
```

### 5. Validate Configuration

```tsx
const schemas = {
  ui: uiSchema,
  features: featuresSchema
};

function App() {
  return (
    <ConfigProvider schemas={schemas}>
      <YourApp />
    </ConfigProvider>
  );
}
```

### 6. Use Helper Components

```tsx
// Good: Declarative
<FeatureFlag flag="new-feature">
  <NewFeature />
</FeatureFlag>

// Less ideal: Imperative
const isEnabled = useFeatureFlag('new-feature');
return isEnabled ? <NewFeature /> : null;
```

## Error Handling

### Error Boundary

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary
      fallback={<ConfigErrorFallback />}
      onError={(error) => {
        console.error('Configuration error:', error);
      }}
    >
      <ConfigProvider config={config}>
        <YourApp />
      </ConfigProvider>
    </ErrorBoundary>
  );
}
```

### Validation Errors

```tsx
function App() {
  const handleValidationError = (errors) => {
    console.error('Config validation failed:', errors);
    // Show error UI or send to monitoring
  };

  return (
    <ConfigProvider
      schemas={schemas}
      onValidationError={handleValidationError}
    >
      <YourApp />
    </ConfigProvider>
  );
}
```

## Testing

### Mock Provider

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
  ui: { theme: 'dark' }
});
```

### Test Context

```tsx
import { ConfigContext } from '@/config';

const mockContext = {
  registry: mockRegistry,
  initialized: true,
  loading: false,
  error: null,
  refresh: vi.fn(),
  validate: vi.fn()
};

render(
  <ConfigContext.Provider value={mockContext}>
    <MyComponent />
  </ConfigContext.Provider>
);
```

### Test HOC

```tsx
import { withConfig } from '@/config';

const MockedComponent = withConfig(MyComponent);

render(
  <ConfigProvider config={testConfig}>
    <MockedComponent />
  </ConfigProvider>
);
```

## Performance Optimization

### 1. Memoize Config Objects

```tsx
const config = useMemo(() => ({
  app: appConfig,
  ui: uiConfig
}), [appConfig, uiConfig]);
```

### 2. Selective Context Access

```tsx
// Good: Use specific hooks
const theme = useConfigValue('ui', 'theme');

// Bad: Use entire context
const context = useConfigContext();
const theme = context.registry.get('ui', 'theme');
```

### 3. Lazy Provider Initialization

```tsx
const [provider] = useState(() => {
  // Heavy initialization only once
  return createConfigProvider(complexConfig);
});

return <ConfigProvider {...provider} />;
```

## See Also

- [README.md](./README.md) - Configuration overview
- [HOOKS.md](./HOOKS.md) - Configuration hooks
- [REGISTRY.md](./REGISTRY.md) - Configuration registry
- [DYNAMIC.md](./DYNAMIC.md) - Dynamic configuration
- [TYPES.md](./TYPES.md) - TypeScript types
