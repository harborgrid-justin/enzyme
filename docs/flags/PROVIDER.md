# Feature Flag Provider

Complete documentation for `FeatureFlagProvider` - the foundational component for feature flag management in @missionfabric-js/enzyme.

## Overview

The `FeatureFlagProvider` is a React context provider that manages feature flag state, evaluation, and updates throughout your application.

**Location**: `/home/user/enzyme/src/lib/flags/FeatureFlagProvider.tsx`

## Table of Contents

- [Basic Usage](#basic-usage)
- [Provider Props](#provider-props)
- [Configuration](#configuration)
- [Context API](#context-api)
- [Advanced Patterns](#advanced-patterns)
- [Provider Strategies](#provider-strategies)
- [Testing](#testing)

## Basic Usage

### Simple Setup

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

function App() {
  return (
    <FeatureFlagProvider
      flags={[
        { key: 'new-dashboard', enabled: true, defaultValue: false },
        { key: 'beta-features', enabled: true, defaultValue: false }
      ]}
    >
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### With Configuration

```tsx
<FeatureFlagProvider
  flags={initialFlags}
  config={{
    enableAnalytics: true,
    enableDebugMode: process.env.NODE_ENV === 'development',
    fallbackBehavior: 'default-value',
    evaluationStrategy: 'client-side'
  }}
  context={{
    userId: currentUser?.id,
    environment: process.env.NODE_ENV,
    customAttributes: {
      subscription: currentUser?.subscription,
      region: currentUser?.region
    }
  }}
>
  <App />
</FeatureFlagProvider>
```

### With Remote Provider

```tsx
import { FeatureFlagProvider } from '@/lib/flags';
import { RemoteProvider } from '@/lib/flags/providers';

function App() {
  const provider = useMemo(
    () =>
      new RemoteProvider({
        endpoint: 'https://api.example.com/flags',
        apiKey: process.env.VITE_FLAGS_API_KEY,
        retry: { maxAttempts: 3, baseDelay: 1000 }
      }),
    []
  );

  return (
    <FeatureFlagProvider provider={provider}>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

## Provider Props

### Core Props

#### `flags` (optional)

Initial flags for static/local configuration.

```typescript
type FeatureFlag = {
  key: string;
  enabled: boolean;
  defaultValue: boolean | string | number;
  name?: string;
  description?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
};

flags?: readonly FeatureFlag[];
```

**Example:**

```tsx
<FeatureFlagProvider
  flags={[
    {
      key: 'new-checkout',
      enabled: true,
      defaultValue: false,
      name: 'New Checkout Flow',
      description: 'Improved checkout with 2-step process',
      tags: ['checkout', 'conversion']
    }
  ]}
>
```

#### `provider` (optional)

Custom flag provider for remote/dynamic flags.

```typescript
provider?: FlagProvider;
```

**Example:**

```tsx
import { CompositeProvider, LocalProvider, RemoteProvider } from '@/lib/flags/providers';

const provider = new CompositeProvider({
  providers: [
    new RemoteProvider({ endpoint: '/api/flags' }),
    new LocalProvider({ flags: defaultFlags })
  ],
  strategy: 'priority'
});

<FeatureFlagProvider provider={provider}>
```

#### `config` (optional)

Provider configuration options.

```typescript
type ProviderConfig = {
  enableAnalytics?: boolean;
  enableDebugMode?: boolean;
  fallbackBehavior?: 'default-value' | 'disabled' | 'throw';
  evaluationStrategy?: 'client-side' | 'server-side';
  cacheStrategy?: 'memory' | 'localStorage' | 'none';
  cacheTTL?: number;
};

config?: ProviderConfig;
```

#### `context` (optional)

Evaluation context for targeting and rollouts.

```typescript
type EvaluationContext = {
  userId?: string;
  sessionId?: string;
  environment?: 'development' | 'staging' | 'production';
  userRole?: string;
  customAttributes?: Record<string, JsonValue>;
  timestamp?: Date;
};

context?: EvaluationContext;
```

#### `children`

React children to render.

```typescript
children: React.ReactNode;
```

## Configuration

### Analytics Configuration

```tsx
<FeatureFlagProvider
  config={{
    enableAnalytics: true,
    analyticsConfig: {
      trackExposures: true,
      trackEvaluations: false,
      sampleRate: 1.0,
      destination: 'analytics-service'
    }
  }}
>
```

### Debug Mode

```tsx
<FeatureFlagProvider
  config={{
    enableDebugMode: true,
    debugConfig: {
      logEvaluations: true,
      logProviderChanges: true,
      showDebugPanel: true
    }
  }}
>
```

### Fallback Behavior

```tsx
<FeatureFlagProvider
  config={{
    fallbackBehavior: 'default-value', // Use default value when flag not found
    // OR
    fallbackBehavior: 'disabled',      // Treat as disabled
    // OR
    fallbackBehavior: 'throw'          // Throw error (strict mode)
  }}
>
```

### Cache Strategy

```tsx
<FeatureFlagProvider
  config={{
    cacheStrategy: 'localStorage',
    cacheTTL: 3600000, // 1 hour
    cacheKey: 'app-feature-flags'
  }}
>
```

## Context API

### Context Value

The provider exposes the following through context:

```typescript
interface FeatureFlagContextValue {
  // Flag evaluation
  getFlag: (key: string) => boolean;
  getVariant: (key: string) => VariantId | undefined;
  getFlagValue: <T>(key: string) => T | undefined;

  // Flag metadata
  getFlagMetadata: (key: string) => FlagMetadata | undefined;
  getAllFlags: () => FeatureFlag[];

  // Dynamic updates
  updateFlag: (key: string, value: boolean) => void;
  refreshFlags: () => Promise<void>;

  // State
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
}
```

### Using Context Directly

```tsx
import { useFeatureFlagContext } from '@/lib/flags';

function MyComponent() {
  const { getFlag, getAllFlags, isReady } = useFeatureFlagContext();

  if (!isReady) return <Loading />;

  const allFlags = getAllFlags();

  return (
    <div>
      {allFlags.map((flag) => (
        <FlagItem
          key={flag.key}
          flag={flag}
          enabled={getFlag(flag.key)}
        />
      ))}
    </div>
  );
}
```

## Advanced Patterns

### Nested Providers

```tsx
function App() {
  return (
    <FeatureFlagProvider flags={globalFlags}>
      <GlobalApp />

      {/* Override flags for specific section */}
      <FeatureFlagProvider flags={adminFlags}>
        <AdminPanel />
      </FeatureFlagProvider>
    </FeatureFlagProvider>
  );
}
```

### Dynamic Context Updates

```tsx
function UserAwareProvider({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();

  const context = useMemo(
    () => ({
      userId: user?.id,
      userRole: user?.role,
      customAttributes: {
        subscription: user?.subscription,
        region: user?.region,
        joinedAt: user?.createdAt
      }
    }),
    [user]
  );

  return (
    <FeatureFlagProvider context={context}>
      {children}
    </FeatureFlagProvider>
  );
}
```

### Async Initialization

```tsx
function App() {
  const [provider, setProvider] = useState<FlagProvider | null>(null);

  useEffect(() => {
    async function initializeProvider() {
      const remote = new RemoteProvider({
        endpoint: '/api/flags'
      });
      await remote.initialize();
      setProvider(remote);
    }

    initializeProvider();
  }, []);

  if (!provider) {
    return <LoadingScreen />;
  }

  return (
    <FeatureFlagProvider provider={provider}>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### Provider with Polling

```tsx
import { PollingProvider, RemoteProvider } from '@/lib/flags/providers';

function App() {
  const provider = useMemo(
    () =>
      new PollingProvider({
        provider: new RemoteProvider({ endpoint: '/api/flags' }),
        interval: 60000, // Poll every minute
        pauseWhenHidden: true
      }),
    []
  );

  return (
    <FeatureFlagProvider provider={provider}>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### Provider with WebSocket

```tsx
import { WebSocketProvider } from '@/lib/flags/providers';

function App() {
  const provider = useMemo(
    () =>
      new WebSocketProvider({
        url: 'wss://api.example.com/flags',
        authToken: getAuthToken(),
        reconnect: { enabled: true, maxAttempts: 5 }
      }),
    []
  );

  return (
    <FeatureFlagProvider provider={provider}>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

## Provider Strategies

### Local-First with Remote Fallback

```tsx
import { CompositeProvider, LocalProvider, RemoteProvider } from '@/lib/flags/providers';

const provider = new CompositeProvider({
  providers: [
    new LocalProvider({ flags: defaultFlags, persistToStorage: true }),
    new RemoteProvider({ endpoint: '/api/flags' })
  ],
  strategy: 'priority',
  fallback: 'first-available'
});
```

### Cached Remote Provider

```tsx
import { CachedProvider, RemoteProvider } from '@/lib/flags/providers';

const provider = new CachedProvider({
  provider: new RemoteProvider({ endpoint: '/api/flags' }),
  ttl: 300000, // 5 minutes
  staleWhileRevalidate: 60000, // 1 minute
  storage: 'localStorage'
});
```

### Multi-Source Composite

```tsx
import { CompositeProvider } from '@/lib/flags/providers';

const provider = new CompositeProvider({
  providers: [
    localProvider,    // Priority 1: Local overrides
    remoteProvider,   // Priority 2: Remote config
    defaultProvider   // Priority 3: Defaults
  ],
  strategy: 'priority'
});
```

## Testing

### Basic Provider Testing

```tsx
import { render } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

describe('FeatureFlagProvider', () => {
  it('provides flag values to children', () => {
    const { getByText } = render(
      <FeatureFlagProvider
        flags={[{ key: 'test-flag', enabled: true, defaultValue: true }]}
      >
        <TestComponent />
      </FeatureFlagProvider>
    );

    expect(getByText('Feature Enabled')).toBeInTheDocument();
  });
});
```

### Testing with Mock Provider

```tsx
import { LocalProvider } from '@/lib/flags/providers';

const mockProvider = new LocalProvider({
  flags: [
    { key: 'feature-a', enabled: true, defaultValue: true },
    { key: 'feature-b', enabled: true, defaultValue: false }
  ]
});

render(
  <FeatureFlagProvider provider={mockProvider}>
    <App />
  </FeatureFlagProvider>
);
```

### Testing Flag Updates

```tsx
import { act, renderHook } from '@testing-library/react';
import { useFeatureFlag, FeatureFlagProvider } from '@/lib/flags';

it('updates flag values dynamically', async () => {
  const wrapper = ({ children }) => (
    <FeatureFlagProvider
      flags={[{ key: 'dynamic-flag', enabled: true, defaultValue: false }]}
    >
      {children}
    </FeatureFlagProvider>
  );

  const { result } = renderHook(() => useFeatureFlag('dynamic-flag'), {
    wrapper
  });

  expect(result.current).toBe(false);

  // Simulate flag update
  act(() => {
    // Update logic
  });

  expect(result.current).toBe(true);
});
```

### Test Utilities

```tsx
// test-utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

interface CustomRenderOptions extends RenderOptions {
  flags?: FeatureFlag[];
}

export function renderWithFlags(
  ui: ReactElement,
  { flags = [], ...options }: CustomRenderOptions = {}
) {
  return render(
    <FeatureFlagProvider flags={flags}>
      {ui}
    </FeatureFlagProvider>,
    options
  );
}
```

## Performance Considerations

### Memoization

```tsx
function App() {
  const flags = useMemo(() => [
    { key: 'feature-a', enabled: true, defaultValue: false }
  ], []);

  const context = useMemo(() => ({
    userId: currentUser?.id,
    environment: process.env.NODE_ENV
  }), [currentUser?.id]);

  return (
    <FeatureFlagProvider flags={flags} context={context}>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### Lazy Provider Initialization

```tsx
function App() {
  const provider = useMemo(() => {
    // Heavy initialization only once
    return new RemoteProvider({ endpoint: '/api/flags' });
  }, []);

  return (
    <FeatureFlagProvider provider={provider}>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

## See Also

- [COMPONENTS.md](./COMPONENTS.md) - Flag components (FlagGate, etc.)
- [HOOKS.md](./HOOKS.md) - Feature flag hooks
- [README.md](./README.md) - Feature flags overview
- `/lib/flags/providers/` - Provider implementations
