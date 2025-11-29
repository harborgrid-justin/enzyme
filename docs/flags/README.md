# Feature Flags Overview

Comprehensive feature flag system for runtime feature control, A/B testing, and gradual rollouts in @missionfabric-js/enzyme.

## Table of Contents

- [Architecture](#architecture)
- [Flag Types](#flag-types)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

## Architecture

The feature flag system is built on a modular architecture with multiple layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (React Components, Hooks, HOCs)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Integration Layer                          │
│  (Library Integration, Domain-specific Flags)               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                      Core Layer                              │
│  (Flag Engine, Evaluation, Providers)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Provider Layer                            │
│  (Local, Remote, Cached, Composite, WebSocket)              │
└─────────────────────────────────────────────────────────────┘
```

### Key Modules

- **Core** (`/lib/flags/*.tsx`): Provider, gate, hooks
- **Advanced** (`/lib/flags/advanced/`): Engine, variants, rollouts, targeting
- **Analytics** (`/lib/flags/analytics/`): Exposure tracking, impact analysis
- **Integration** (`/lib/flags/integration/`): Library integration, domain flags
- **Providers** (`/lib/flags/providers/`): Data sources (local, remote, WebSocket)

## Flag Types

### 1. Boolean Flags

Simple on/off toggles:

```typescript
{
  key: 'new-dashboard',
  enabled: true,
  defaultValue: false
}
```

### 2. Variant Flags

Multi-variant flags for A/B testing:

```typescript
{
  key: 'checkout-flow',
  enabled: true,
  defaultVariant: 'control',
  variants: [
    { id: 'control', name: 'Original', config: {} },
    { id: 'variant-a', name: 'Optimized', config: { steps: 2 } },
    { id: 'variant-b', name: 'Express', config: { steps: 1 } }
  ]
}
```

### 3. Rollout Flags

Gradual percentage-based rollouts:

```typescript
{
  key: 'new-feature',
  enabled: true,
  rollout: {
    percentage: 25,
    type: 'user-based',
    groups: ['beta-testers']
  }
}
```

### 4. Targeted Flags

Rules-based targeting:

```typescript
{
  key: 'premium-feature',
  enabled: true,
  targeting: {
    rules: [
      {
        attribute: 'subscription',
        operator: 'equals',
        value: 'premium'
      }
    ]
  }
}
```

## Quick Start

### 1. Setup Provider

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

function App() {
  return (
    <FeatureFlagProvider
      flags={[
        { key: 'new-feature', enabled: true, defaultValue: false }
      ]}
      config={{
        enableAnalytics: true,
        enableDebugMode: process.env.NODE_ENV === 'development'
      }}
    >
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### 2. Use Hooks

```tsx
import { useFeatureFlag } from '@/lib/flags';

function MyComponent() {
  const isEnabled = useFeatureFlag('new-feature');

  return isEnabled ? <NewFeature /> : <OldFeature />;
}
```

### 3. Use Components

```tsx
import { FlagGate } from '@/lib/flags';

function Dashboard() {
  return (
    <div>
      <FlagGate flagKey="new-dashboard">
        <NewDashboard />
      </FlagGate>

      <FlagGate flagKey="beta-features" fallback={<ComingSoon />}>
        <BetaFeature />
      </FlagGate>
    </div>
  );
}
```

### 4. Use HOC

```tsx
import { withFeatureFlag } from '@/lib/flags';

const EnhancedComponent = withFeatureFlag('premium-feature')(
  PremiumComponent,
  {
    fallback: <UpgradePrompt />,
    loading: <Spinner />
  }
);
```

## Core Concepts

### Flag Evaluation

Flags are evaluated using a priority-based system:

1. **Override** (highest priority) - Development/testing overrides
2. **Targeting Rules** - User/context-based targeting
3. **Rollout Percentage** - Gradual rollout percentage
4. **Dependencies** - Parent flag requirements
5. **Default Value** (lowest priority) - Fallback value

### Flag Context

Evaluation context provides user and environment information:

```typescript
interface EvaluationContext {
  userId?: string;
  sessionId?: string;
  environment?: 'development' | 'staging' | 'production';
  customAttributes?: Record<string, JsonValue>;
  timestamp?: Date;
}
```

### Flag Lifecycle

1. **Draft** - Being developed
2. **Testing** - Internal testing
3. **Rollout** - Gradual deployment
4. **Active** - Fully deployed
5. **Deprecated** - Being phased out
6. **Archived** - Removed

## Usage Patterns

### Environment-Specific Flags

```typescript
const flags: FeatureFlag[] = [
  {
    key: 'debug-panel',
    enabled: true,
    defaultValue: false,
    environments: ['development', 'staging']
  }
];
```

### User Segment Targeting

```typescript
{
  key: 'beta-feature',
  enabled: true,
  targeting: {
    segments: ['beta-testers', 'early-adopters']
  }
}
```

### Gradual Rollout

```typescript
{
  key: 'new-search',
  enabled: true,
  rollout: {
    percentage: 10, // Start with 10%
    sticky: true,   // Consistent user experience
    seed: 'user-id' // Hash key for consistency
  }
}
```

### A/B Testing

```typescript
import { useVariant } from '@/lib/flags';

function CheckoutFlow() {
  const variant = useVariant('checkout-experiment');

  switch (variant?.id) {
    case 'variant-a':
      return <OptimizedCheckout />;
    case 'variant-b':
      return <ExpressCheckout />;
    default:
      return <StandardCheckout />;
  }
}
```

### Flag Dependencies

```typescript
{
  key: 'advanced-analytics',
  enabled: true,
  dependencies: {
    required: ['analytics-enabled'],
    any: ['premium-plan', 'trial-active']
  }
}
```

## Best Practices

### 1. Naming Conventions

```typescript
// Good
'new-dashboard'
'beta-search-v2'
'experiment-checkout-flow'

// Bad
'feature1'
'test'
'temp-flag'
```

### 2. Flag Cleanup

Remove flags after full rollout:

```typescript
// Before
<FlagGate flagKey="new-feature">
  <NewFeature />
</FlagGate>

// After (flag removed)
<NewFeature />
```

### 3. Testing Strategy

```typescript
import { render } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

describe('MyComponent', () => {
  it('renders with flag enabled', () => {
    render(
      <FeatureFlagProvider
        flags={[{ key: 'test-flag', enabled: true, defaultValue: true }]}
      >
        <MyComponent />
      </FeatureFlagProvider>
    );
    // assertions
  });
});
```

### 4. Analytics Integration

```typescript
import { useFlagAnalytics } from '@/lib/flags/integration';

function MyFeature() {
  const { trackExposure } = useFlagAnalytics();

  useEffect(() => {
    trackExposure('my-feature');
  }, [trackExposure]);

  return <Feature />;
}
```

### 5. Type Safety

```typescript
// Define flag keys as const
export const FLAG_KEYS = {
  NEW_DASHBOARD: 'new-dashboard',
  BETA_FEATURES: 'beta-features',
  PREMIUM_CONTENT: 'premium-content'
} as const;

type FlagKey = typeof FLAG_KEYS[keyof typeof FLAG_KEYS];

// Use typed hook
function useTypedFlag(key: FlagKey) {
  return useFeatureFlag(key);
}
```

### 6. Performance Optimization

```typescript
import { memo } from 'react';
import { useFeatureFlag } from '@/lib/flags';

const ExpensiveComponent = memo(function ExpensiveComponent() {
  const isEnabled = useFeatureFlag('expensive-feature');

  if (!isEnabled) return null;

  return <ExpensiveFeature />;
});
```

## Testing Strategies

### Unit Testing

```typescript
import { FlagEngine } from '@/lib/flags/advanced';

describe('FlagEngine', () => {
  it('evaluates flags correctly', () => {
    const engine = new FlagEngine();
    const result = engine.evaluateFlag(
      { key: 'test', enabled: true, defaultValue: true },
      { userId: 'user-123' }
    );
    expect(result.enabled).toBe(true);
  });
});
```

### Integration Testing

```typescript
import { render, waitFor } from '@testing-library/react';
import { RemoteProvider } from '@/lib/flags/providers';

it('loads flags from remote', async () => {
  const provider = new RemoteProvider({
    endpoint: 'http://test-api/flags'
  });

  await waitFor(() => {
    expect(provider.isReady()).toBe(true);
  });
});
```

### E2E Testing

```typescript
// Cypress example
describe('Feature Flags', () => {
  it('shows new feature when flag is enabled', () => {
    cy.intercept('GET', '/api/flags', {
      flags: [{ key: 'new-feature', enabled: true }]
    });

    cy.visit('/dashboard');
    cy.get('[data-testid="new-feature"]').should('be.visible');
  });
});
```

## Detailed Documentation

For in-depth information on specific flag features:

- **[PROVIDER.md](./PROVIDER.md)** - Feature Flag Provider setup and configuration
- **[COMPONENTS.md](./COMPONENTS.md)** - Flag components (FlagGate, FlagGateAll, FlagGateAny)
- **[HOOKS.md](./HOOKS.md)** - Feature flag hooks API reference
- **[INTEGRATION.md](./INTEGRATION.md)** - Library and domain integrations
- **[AB_TESTING.md](./AB_TESTING.md)** - A/B testing and experimentation guide
- **[CONDITIONAL_RENDERING.md](./CONDITIONAL_RENDERING.md)** - Conditional rendering patterns

## Integration

### With Security

Feature flags can be used to progressively roll out security features:

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { useSecurityContext } from '@/lib/security';

function SecurityFeature() {
  const advancedSecurity = useFeatureFlag('advanced-security');
  const { config } = useSecurityContext();

  if (advancedSecurity) {
    config.csrf.tokenRotationInterval = 300000; // 5 minutes
  }

  return <SecureApp />;
}
```

See [Security Module](../security/README.md) for more details.

### With Authentication

Control access to features based on authentication and feature flags:

```tsx
import { useAuth } from '@/lib/auth';
import { useFeatureFlag } from '@/lib/flags';

function PremiumFeature() {
  const { user } = useAuth();
  const premiumEnabled = useFeatureFlag('premium-features');

  if (!user?.isPremium || !premiumEnabled) {
    return <UpgradePrompt />;
  }

  return <PremiumContent />;
}
```

See [Auth Module](../auth/README.md) for more details.

### With Configuration

Feature flags work seamlessly with the configuration system:

```tsx
import { useConfig } from '@/config';
import { useFeatureFlag } from '@/lib/flags';

function ConfigurableFeature() {
  const newLayout = useFeatureFlag('new-layout');
  const [layoutConfig] = useConfig('ui', 'layout');

  return newLayout ? <NewLayout config={layoutConfig} /> : <OldLayout />;
}
```

See [Configuration Module](../config/README.md) for more details.

## See Also

### Internal Documentation
- [Security Module](../security/README.md) - Flag-controlled security features
- [Auth Module](../auth/README.md) - Authentication with feature flags
- [Configuration](../config/README.md) - Config and feature flag integration
- [Contexts](../advanced/CONTEXTS.md) - Feature flag context and providers

### Implementation
- `/lib/flags/` - Core implementation
- `/lib/flags/advanced/` - Advanced features (engine, variants, rollouts)
- `/lib/flags/analytics/` - Analytics and tracking
- `/lib/flags/integration/` - Integration patterns
- `/lib/flags/providers/` - Data providers (local, remote, WebSocket)
