# Advanced Feature Flag Examples

> **Module**: `@/lib/flags`
> **Key Exports**: `useFeatureFlag`, `FlagGate`, `FeatureFlagProvider`, `FlagEngine`

This guide provides advanced examples for implementing sophisticated feature flag patterns.

---

## Table of Contents

- [Basic Usage Recap](#basic-usage-recap)
- [Percentage Rollouts](#percentage-rollouts)
- [User Targeting](#user-targeting)
- [A/B Testing](#ab-testing)
- [Flag Dependencies](#flag-dependencies)
- [Analytics Integration](#analytics-integration)
- [Server Sync](#server-sync)
- [Testing Strategies](#testing-strategies)

---

## Basic Usage Recap

### Hook-Based Flag Check

```tsx
import { useFeatureFlag } from '@/lib/flags';

function MyComponent() {
  const isNewUIEnabled = useFeatureFlag('new-ui');

  if (isNewUIEnabled) {
    return <NewUI />;
  }

  return <LegacyUI />;
}
```

### Declarative Flag Gate

```tsx
import { FlagGate } from '@/lib/flags';

function Dashboard() {
  return (
    <div>
      <FlagGate flagKey="beta-features" fallback={<LegacyDashboard />}>
        <BetaDashboard />
      </FlagGate>
    </div>
  );
}
```

---

## Percentage Rollouts

### Gradual Feature Rollout

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

function App() {
  const flagConfig = {
    flags: {
      'new-checkout': {
        enabled: true,
        percentage: 25, // 25% of users
      },
      'redesigned-header': {
        enabled: true,
        percentage: 50, // 50% of users
      },
    },
  };

  return (
    <FeatureFlagProvider config={flagConfig}>
      <MyApp />
    </FeatureFlagProvider>
  );
}
```

### Progressive Rollout Strategy

```tsx
// Day 1: 5% rollout
const initialRollout = { percentage: 5 };

// Day 3: 25% rollout
const expandedRollout = { percentage: 25 };

// Day 7: 50% rollout
const halfRollout = { percentage: 50 };

// Day 14: Full rollout
const fullRollout = { percentage: 100 };

// Emergency rollback
const emergencyOff = { enabled: false };
```

### Sticky User Assignment

```tsx
import { createFlagEngine } from '@/lib/flags/advanced';

const engine = createFlagEngine({
  flags: {
    'experiment-v2': {
      enabled: true,
      percentage: 30,
    },
  },
  // User ID for consistent assignment
  getUserId: () => currentUser.id,
  // Use consistent hashing for stable assignment
  hashAlgorithm: 'murmur3',
});

function Experiment() {
  const isInExperiment = engine.evaluate('experiment-v2');

  // Same user always gets same result
  return isInExperiment ? <ExperimentalFeature /> : <ControlFeature />;
}
```

---

## User Targeting

### Role-Based Targeting

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

const flagConfig = {
  flags: {
    'admin-dashboard': {
      enabled: true,
      targeting: {
        rules: [
          {
            attribute: 'role',
            operator: 'equals',
            value: 'admin',
          },
        ],
      },
    },
  },
};

function App() {
  const user = useAuth();

  return (
    <FeatureFlagProvider
      config={flagConfig}
      context={{ role: user.role, id: user.id }}
    >
      <Dashboard />
    </FeatureFlagProvider>
  );
}
```

### Attribute-Based Targeting

```tsx
const flagConfig = {
  flags: {
    'premium-features': {
      enabled: true,
      targeting: {
        rules: [
          {
            attribute: 'subscription',
            operator: 'in',
            value: ['premium', 'enterprise'],
          },
        ],
      },
    },
    'beta-tester': {
      enabled: true,
      targeting: {
        rules: [
          {
            attribute: 'email',
            operator: 'endsWith',
            value: '@company.com',
          },
          {
            attribute: 'betaOptIn',
            operator: 'equals',
            value: true,
          },
        ],
        matchMode: 'any', // OR logic
      },
    },
  },
};
```

### Segment-Based Targeting

```tsx
const flagConfig = {
  flags: {
    'new-pricing-page': {
      enabled: true,
      targeting: {
        segments: ['power-users', 'enterprise-trial'],
      },
    },
  },
  segments: {
    'power-users': {
      rules: [
        { attribute: 'monthlyUsage', operator: 'greaterThan', value: 1000 },
      ],
    },
    'enterprise-trial': {
      rules: [
        { attribute: 'plan', operator: 'equals', value: 'enterprise-trial' },
        { attribute: 'trialDaysRemaining', operator: 'greaterThan', value: 0 },
      ],
    },
  },
};
```

---

## A/B Testing

### Simple A/B Test

```tsx
import { useFlagVariant } from '@/lib/flags/advanced';

function PricingPage() {
  const { variant, trackExposure } = useFlagVariant('pricing-experiment');

  // Track that user saw this variant
  useEffect(() => {
    trackExposure();
  }, [trackExposure]);

  switch (variant) {
    case 'control':
      return <OriginalPricing />;
    case 'variant-a':
      return <SimplifiedPricing />;
    case 'variant-b':
      return <TieredPricing />;
    default:
      return <OriginalPricing />;
  }
}
```

### Multi-Variant Configuration

```tsx
const flagConfig = {
  flags: {
    'checkout-experiment': {
      enabled: true,
      variants: {
        control: { weight: 34 },      // 34% of users
        'single-page': { weight: 33 }, // 33% of users
        'wizard': { weight: 33 },      // 33% of users
      },
    },
  },
};
```

### Variant with Payload

```tsx
const flagConfig = {
  flags: {
    'button-color-test': {
      enabled: true,
      variants: {
        control: {
          weight: 50,
          payload: { color: '#3b82f6', text: 'Sign Up' },
        },
        treatment: {
          weight: 50,
          payload: { color: '#22c55e', text: 'Get Started' },
        },
      },
    },
  },
};

function SignUpButton() {
  const { variant, payload } = useFlagVariant('button-color-test');

  return (
    <button style={{ backgroundColor: payload.color }}>
      {payload.text}
    </button>
  );
}
```

---

## Flag Dependencies

### Prerequisite Flags

```tsx
const flagConfig = {
  flags: {
    'new-navigation': {
      enabled: true,
    },
    'advanced-search': {
      enabled: true,
      prerequisites: ['new-navigation'], // Only enable if new-navigation is on
    },
    'ai-search': {
      enabled: true,
      prerequisites: ['new-navigation', 'advanced-search'], // Chain dependencies
    },
  },
};
```

### Mutex Flags (Mutually Exclusive)

```tsx
const flagConfig = {
  flags: {
    'experiment-a': {
      enabled: true,
      percentage: 25,
      mutex: ['experiment-b', 'experiment-c'],
    },
    'experiment-b': {
      enabled: true,
      percentage: 25,
      mutex: ['experiment-a', 'experiment-c'],
    },
    'experiment-c': {
      enabled: true,
      percentage: 25,
      mutex: ['experiment-a', 'experiment-b'],
    },
  },
};

// Only one of these experiments will be active for any given user
```

### Dynamic Dependencies

```tsx
import { useFlagValue, useFeatureFlag } from '@/lib/flags';

function AdvancedFeature() {
  const hasBaseFeature = useFeatureFlag('base-feature');
  const hasAdvanced = useFeatureFlag('advanced-feature');

  // Manual dependency check
  const showAdvanced = hasBaseFeature && hasAdvanced;

  if (!showAdvanced) {
    return <BaseFeature />;
  }

  return <AdvancedFeature />;
}
```

---

## Analytics Integration

### Tracking Flag Exposures

```tsx
import { useFlagAnalytics } from '@/lib/flags/analytics';

function FeatureComponent() {
  const isEnabled = useFeatureFlag('my-feature');
  const { trackExposure, trackConversion } = useFlagAnalytics('my-feature');

  useEffect(() => {
    // Track when user sees the feature decision
    trackExposure();
  }, [trackExposure]);

  const handleConversion = () => {
    // Track successful conversion
    trackConversion('signup');
  };

  return isEnabled ? (
    <NewFeature onConvert={handleConversion} />
  ) : (
    <OldFeature onConvert={handleConversion} />
  );
}
```

### Analytics with External Provider

```tsx
import { FeatureFlagProvider } from '@/lib/flags';
import { analytics } from '@/lib/utils/analytics';

function App() {
  const onFlagExposure = (flagKey: string, variant: string) => {
    analytics.track('Feature Flag Exposure', {
      flagKey,
      variant,
      timestamp: Date.now(),
    });
  };

  const onFlagConversion = (flagKey: string, event: string) => {
    analytics.track('Feature Flag Conversion', {
      flagKey,
      event,
      timestamp: Date.now(),
    });
  };

  return (
    <FeatureFlagProvider
      config={flagConfig}
      onExposure={onFlagExposure}
      onConversion={onFlagConversion}
    >
      <MyApp />
    </FeatureFlagProvider>
  );
}
```

### Impact Analysis

```tsx
import { useImpactAnalyzer } from '@/lib/flags/analytics';

function FeatureImpactDashboard() {
  const { metrics, isLoading } = useImpactAnalyzer('checkout-experiment');

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h2>Experiment Impact</h2>
      <table>
        <thead>
          <tr>
            <th>Variant</th>
            <th>Conversion Rate</th>
            <th>Avg Order Value</th>
            <th>Error Rate</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(metrics.variants).map(([variant, data]) => (
            <tr key={variant}>
              <td>{variant}</td>
              <td>{(data.conversionRate * 100).toFixed(1)}%</td>
              <td>${data.avgOrderValue.toFixed(2)}</td>
              <td>{(data.errorRate * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Server Sync

### Remote Flag Provider

```tsx
import { FeatureFlagProvider, RemoteProvider } from '@/lib/flags';

function App() {
  return (
    <FeatureFlagProvider
      provider={new RemoteProvider({
        url: '/api/feature-flags',
        refreshInterval: 60000, // Refresh every minute
        fallbackFlags: {
          'new-feature': false, // Fallback if server unavailable
        },
      })}
    >
      <MyApp />
    </FeatureFlagProvider>
  );
}
```

### Real-Time Updates via WebSocket

```tsx
import { WebSocketProvider } from '@/lib/flags/providers';

function App() {
  return (
    <FeatureFlagProvider
      provider={new WebSocketProvider({
        url: 'wss://flags.example.com/ws',
        onConnect: () => console.log('Flags connected'),
        onUpdate: (flags) => console.log('Flags updated:', flags),
        reconnectInterval: 5000,
      })}
    >
      <MyApp />
    </FeatureFlagProvider>
  );
}
```

### Cached Provider with Stale-While-Revalidate

```tsx
import { CachedProvider } from '@/lib/flags/providers';

function App() {
  return (
    <FeatureFlagProvider
      provider={new CachedProvider({
        remoteUrl: '/api/feature-flags',
        cacheKey: 'feature-flags',
        cacheTTL: 300000, // 5 minutes
        staleWhileRevalidate: true,
      })}
    >
      <MyApp />
    </FeatureFlagProvider>
  );
}
```

---

## Testing Strategies

### Override Flags in Tests

```tsx
import { render } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

function renderWithFlags(ui: React.ReactElement, flags: Record<string, boolean>) {
  return render(
    <FeatureFlagProvider config={{ flags }}>
      {ui}
    </FeatureFlagProvider>
  );
}

// In tests
describe('MyComponent', () => {
  it('shows new UI when flag enabled', () => {
    const { getByText } = renderWithFlags(
      <MyComponent />,
      { 'new-ui': true }
    );
    expect(getByText('New UI')).toBeInTheDocument();
  });

  it('shows legacy UI when flag disabled', () => {
    const { getByText } = renderWithFlags(
      <MyComponent />,
      { 'new-ui': false }
    );
    expect(getByText('Legacy UI')).toBeInTheDocument();
  });
});
```

### Mock Flag Provider

```tsx
import { createMockFlagProvider } from '@/lib/flags/testing';

const mockProvider = createMockFlagProvider({
  initialFlags: {
    'feature-a': true,
    'feature-b': false,
  },
});

// In tests
beforeEach(() => {
  mockProvider.reset();
});

it('responds to flag changes', () => {
  render(
    <FeatureFlagProvider provider={mockProvider}>
      <MyComponent />
    </FeatureFlagProvider>
  );

  // Change flag
  mockProvider.setFlag('feature-b', true);

  // Assert UI updated
  expect(screen.getByText('Feature B')).toBeInTheDocument();
});
```

### Testing Percentage Rollouts

```tsx
describe('Percentage rollout', () => {
  it('respects user assignment', () => {
    const results = new Map<boolean, number>();

    // Test with many user IDs
    for (let i = 0; i < 1000; i++) {
      const engine = createFlagEngine({
        flags: {
          'experiment': { enabled: true, percentage: 30 },
        },
        getUserId: () => `user-${i}`,
      });

      const result = engine.evaluate('experiment');
      results.set(result, (results.get(result) || 0) + 1);
    }

    // Should be approximately 30%
    const enabledCount = results.get(true) || 0;
    expect(enabledCount).toBeGreaterThan(250);
    expect(enabledCount).toBeLessThan(350);
  });
});
```

---

## See Also

- [Authentication Examples](./auth-examples.md)
- [Performance Examples](./performance-examples.md)
- [Testing Examples](./testing-examples.md)
