# Provider Coordination

Automated provider management system for organizing and orchestrating React context providers.

## Table of Contents

- [Overview](#overview)
- [Provider Orchestration](#provider-orchestration)
- [Context Bridging](#context-bridging)
- [Default Components](#default-components)
- [Examples](#examples)

## Overview

The Provider Coordination module automates the management of multiple React context providers, handling dependency ordering, context bridging, and provider composition.

### Key Features

- **Automatic Dependency Ordering**: Topological sort of providers
- **Context Bridging**: Cross-boundary context communication
- **Conditional Providers**: Include providers based on conditions
- **Type-safe APIs**: Full TypeScript support
- **Hot-swappable**: Dynamic provider registration
- **Error Handling**: Integrated error boundaries

## Provider Orchestration

### OrchestratedProviders Component

Automatically compose and order multiple providers.

```tsx
import { OrchestratedProviders } from '@missionfabric-js/enzyme/coordination';

function App() {
  return (
    <OrchestratedProviders
      providers={[
        {
          id: 'theme',
          Component: ThemeProvider,
          dependencies: [],
          props: { defaultTheme: 'light' }
        },
        {
          id: 'auth',
          Component: AuthProvider,
          dependencies: ['theme']
        },
        {
          id: 'data',
          Component: QueryClientProvider,
          dependencies: ['auth'],
          props: { client: queryClient }
        },
        {
          id: 'feature-flags',
          Component: FeatureFlagProvider,
          dependencies: ['auth'],
          condition: () => !isTestEnvironment()
        }
      ]}
      errorBoundary={ErrorBoundary}
      loadingComponent={AppLoading}
      onReady={() => console.log('All providers ready')}
    >
      <AppRoutes />
    </OrchestratedProviders>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `providers` | `ProviderDefinition[]` | - | Provider definitions |
| `errorBoundary` | `ComponentType` | - | Error boundary component |
| `loadingComponent` | `ComponentType` | - | Loading fallback |
| `onReady` | `() => void` | - | Called when ready |
| `children` | `ReactNode` | - | Child content |

#### ProviderDefinition

```typescript
interface ProviderDefinition {
  // Unique identifier
  id: string;

  // Provider component
  Component: ComponentType<{ children: ReactNode }>;

  // Provider dependencies (must be registered first)
  dependencies: string[];

  // Props to pass to provider
  props?: Record<string, unknown>;

  // Rendering order (lower = outer)
  order?: number;

  // Condition for inclusion
  condition?: () => boolean;
}
```

### ProviderOrchestratorImpl Class

Programmatic provider management.

```tsx
import { ProviderOrchestratorImpl } from '@missionfabric-js/enzyme/coordination';

// Create orchestrator
const orchestrator = new ProviderOrchestratorImpl({
  providers: [
    {
      id: 'theme',
      Component: ThemeProvider,
      dependencies: []
    }
  ]
});

// Register additional provider
orchestrator.registerProvider({
  id: 'auth',
  Component: AuthProvider,
  dependencies: ['theme']
});

// Update provider props
orchestrator.updateProviderProps('theme', {
  theme: 'dark'
});

// Enable/disable providers
orchestrator.disableProvider('feature-flags');
orchestrator.enableProvider('feature-flags');

// Get provider tree component
const ProviderTree = orchestrator.getProviderTree();

function App() {
  return (
    <ProviderTree>
      <AppContent />
    </ProviderTree>
  );
}

// Get provider order (for debugging)
const order = orchestrator.getProviderOrder();
// => ['theme', 'auth', 'data']
```

### Global Orchestrator

Singleton instance for app-wide provider management.

```tsx
import {
  getProviderOrchestrator,
  registerProvider,
  getGlobalProviderTree
} from '@missionfabric-js/enzyme/coordination';

// Register providers globally
registerProvider({
  id: 'theme',
  Component: ThemeProvider,
  dependencies: []
});

registerProvider({
  id: 'auth',
  Component: AuthProvider,
  dependencies: ['theme']
});

// Get global provider tree
const GlobalProviders = getGlobalProviderTree();

function App() {
  return (
    <GlobalProviders>
      <AppRoutes />
    </GlobalProviders>
  );
}
```

## Context Bridging

### ContextBridgeProvider

Enable context communication across provider boundaries.

```tsx
import { ContextBridgeProvider } from '@missionfabric-js/enzyme/coordination';

function App() {
  return (
    <ContextBridgeProvider>
      <YourApp />
    </ContextBridgeProvider>
  );
}
```

### Registering Bridges

```tsx
import { useBridgeManager } from '@missionfabric-js/enzyme/coordination';
import { AuthContext } from './auth';
import { UserContext } from './user';

function AppSetup() {
  const bridge = useBridgeManager();

  useEffect(() => {
    // Bridge auth context to user context
    bridge.registerBridge({
      id: 'auth-to-user',
      sourceContext: AuthContext,
      targetContext: UserContext,
      transformer: (auth) => ({
        id: auth.user?.id,
        name: auth.user?.name,
        email: auth.user?.email,
        isAdmin: auth.roles?.includes('admin')
      }),
      updateStrategy: 'batched',
      updateWindow: 16
    });
  }, [bridge]);

  return null;
}
```

### BridgeSource Component

Connect source context to bridge.

```tsx
import { BridgeSource } from '@missionfabric-js/enzyme/coordination';
import { AuthContext } from './auth';

function AuthBridge() {
  return (
    <BridgeSource bridgeId="auth-to-user" context={AuthContext}>
      <App />
    </BridgeSource>
  );
}
```

### BridgeConsumer Component

Consume bridged context value.

```tsx
import { BridgeConsumer } from '@missionfabric-js/enzyme/coordination';

function UserProfile() {
  return (
    <BridgeConsumer bridgeId="auth-to-user">
      {(user) => (
        user ? (
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            {user.isAdmin && <AdminPanel />}
          </div>
        ) : (
          <div>Not logged in</div>
        )
      )}
    </BridgeConsumer>
  );
}
```

### useBridgedContext Hook

Access bridged context values.

```tsx
import { useBridgedContext } from '@missionfabric-js/enzyme/coordination';

function UserInfo() {
  const user = useBridgedContext('auth-to-user');

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### Composed Contexts

Create a single context from multiple sources.

```tsx
import { createComposedContext } from '@missionfabric-js/enzyme/coordination';
import { ThemeContext } from './theme';
import { AuthContext } from './auth';
import { FeatureContext } from './features';

const {
  Context: AppContext,
  Provider: AppContextProvider,
  useComposed: useAppContext
} = createComposedContext({
  displayName: 'AppContext',
  sources: {
    theme: { context: ThemeContext },
    user: {
      context: AuthContext,
      selector: (auth) => auth.user
    },
    features: { context: FeatureContext }
  }
});

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeatureFlagProvider>
          <AppContextProvider>
            <AppContent />
          </AppContextProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, user, features } = useAppContext();

  return (
    <div className={theme}>
      <h1>Welcome, {user?.name}</h1>
      {features.darkMode && <DarkModeToggle />}
    </div>
  );
}
```

## Default Components

### DefaultLoadingFallback

Default loading component for OrchestratedProviders.

```tsx
import { DefaultLoadingFallback } from '@missionfabric-js/enzyme/coordination';

// Used automatically by OrchestratedProviders
<OrchestratedProviders loadingComponent={DefaultLoadingFallback}>
  <App />
</OrchestratedProviders>
```

### DefaultErrorFallback

Default error boundary for provider errors.

```tsx
import { DefaultErrorFallback } from '@missionfabric-js/enzyme/coordination';

<OrchestratedProviders errorBoundary={DefaultErrorFallback}>
  <App />
</OrchestratedProviders>
```

## Examples

### Complete Provider Setup

```tsx
import {
  OrchestratedProviders,
  ContextBridgeProvider
} from '@missionfabric-js/enzyme/coordination';

function App() {
  const providers = [
    // Core providers (no dependencies)
    {
      id: 'theme',
      Component: ThemeProvider,
      dependencies: [],
      props: { defaultTheme: 'system' }
    },
    {
      id: 'i18n',
      Component: I18nProvider,
      dependencies: [],
      props: { locale: 'en' }
    },

    // Auth (depends on theme for styling)
    {
      id: 'auth',
      Component: AuthProvider,
      dependencies: ['theme']
    },

    // Data layer (depends on auth)
    {
      id: 'query',
      Component: QueryClientProvider,
      dependencies: ['auth'],
      props: { client: queryClient }
    },

    // Feature flags (depends on auth)
    {
      id: 'features',
      Component: FeatureFlagProvider,
      dependencies: ['auth', 'query']
    },

    // Analytics (depends on auth and features)
    {
      id: 'analytics',
      Component: AnalyticsProvider,
      dependencies: ['auth', 'features'],
      condition: () => import.meta.env.PROD
    }
  ];

  return (
    <ContextBridgeProvider>
      <OrchestratedProviders
        providers={providers}
        errorBoundary={AppErrorBoundary}
        loadingComponent={AppSplash}
        onReady={() => {
          console.log('App initialized');
          trackEvent('app-ready');
        }}
      >
        <Router>
          <AppRoutes />
        </Router>
      </OrchestratedProviders>
    </ContextBridgeProvider>
  );
}
```

### Dynamic Provider Registration

```tsx
import {
  ProviderOrchestratorImpl,
  getProviderOrchestrator
} from '@missionfabric-js/enzyme/coordination';

// Create orchestrator with base providers
const orchestrator = new ProviderOrchestratorImpl({
  providers: [
    {
      id: 'core',
      Component: CoreProvider,
      dependencies: []
    }
  ]
});

// Dynamically add providers based on features
function setupProviders(userConfig) {
  if (userConfig.enableAnalytics) {
    orchestrator.registerProvider({
      id: 'analytics',
      Component: AnalyticsProvider,
      dependencies: ['core']
    });
  }

  if (userConfig.enableRealtime) {
    orchestrator.registerProvider({
      id: 'realtime',
      Component: RealtimeProvider,
      dependencies: ['core'],
      props: { url: userConfig.wsUrl }
    });
  }

  if (userConfig.enableAB) {
    orchestrator.registerProvider({
      id: 'ab-testing',
      Component: ABTestProvider,
      dependencies: ['core', 'analytics']
    });
  }
}

function App({ userConfig }) {
  useEffect(() => {
    setupProviders(userConfig);
  }, [userConfig]);

  const ProviderTree = orchestrator.getProviderTree();

  return (
    <ProviderTree>
      <AppContent />
    </ProviderTree>
  );
}
```

### Cross-Module Communication

```tsx
import {
  ContextBridgeProvider,
  createComposedContext
} from '@missionfabric-js/enzyme/coordination';

// Module A exports its context
export const ModuleAContext = createContext(null);

export function ModuleAProvider({ children }) {
  const [state, setState] = useState({ count: 0 });

  return (
    <ModuleAContext.Provider value={{ state, setState }}>
      {children}
    </ModuleAContext.Provider>
  );
}

// Module B wants to access Module A's state
function ModuleB() {
  // Use composed context or bridge
  const moduleAState = useBridgedContext('module-a-state');

  return (
    <div>
      Module A count: {moduleAState?.count}
    </div>
  );
}

// Setup in app
function App() {
  const bridge = useBridgeManager();

  useEffect(() => {
    bridge.registerBridge({
      id: 'module-a-state',
      sourceContext: ModuleAContext,
      targetContext: ModuleBContext,
      transformer: (moduleA) => moduleA.state,
      updateStrategy: 'immediate'
    });
  }, [bridge]);

  return (
    <ContextBridgeProvider>
      <ModuleAProvider>
        <BridgeSource bridgeId="module-a-state" context={ModuleAContext}>
          <ModuleB />
        </BridgeSource>
      </ModuleAProvider>
    </ContextBridgeProvider>
  );
}
```

## Best Practices

1. **Define Dependencies Clearly**: Specify all provider dependencies
2. **Use Conditions Wisely**: Conditionally include providers for different environments
3. **Minimize Context Updates**: Use batched update strategy for bridges
4. **Type Your Contexts**: Use TypeScript for context value types
5. **Handle Errors**: Wrap providers with error boundaries
6. **Document Order**: Document why providers are ordered a certain way

## Performance Considerations

1. **Provider Order Matters**: Outer providers wrap inner providers
2. **Batched Updates**: Bridge updates are batched by default (16ms window)
3. **Memoization**: Provider tree is cached and only regenerated when providers change
4. **Lazy Loading**: Use conditions to avoid loading unused providers

## API Reference

See the [Advanced Features Overview](../advanced/README.md) for complete API documentation.

## Related Documentation

### Coordination Features
- **[State Management](../state/README.md)** - Global state with Zustand
- **[Shared Utilities](../shared/README.md)** - Event bus and utilities

### Integration Guides
- **[API Module](../api/README.md)** - API client integration
- **[Hooks](../hooks/README.md)** - Custom hooks
- **[Performance](../performance/README.md)** - Performance optimization

### Reference
- **[Documentation Index](../INDEX.md)** - All documentation resources
- **[Architecture Guide](../ARCHITECTURE.md)** - System architecture
