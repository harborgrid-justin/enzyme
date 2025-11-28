# Feature Flags Guide

> Complete guide to the feature flag system in the Harbor React Library.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Provider Setup](#provider-setup)
- [Checking Flags](#checking-flags)
- [Component-Based Gates](#component-based-gates)
- [HOC Pattern](#hoc-pattern)
- [Flag Sources](#flag-sources)
- [Targeting Rules](#targeting-rules)
- [A/B Testing](#ab-testing)
- [Best Practices](#best-practices)

---

## Overview

The feature flag system enables:

- **Gradual rollouts** of new features
- **A/B testing** with variant support
- **Kill switches** for instant feature disabling
- **User targeting** based on attributes
- **Environment-based flags** for dev/staging/prod
- **Type-safe flag keys** with autocomplete

---

## Quick Start

```tsx
import {
  FeatureFlagProvider,
  useFeatureFlag,
  FlagGate,
} from '@/lib/flags';

// 1. Configure flags
const flags = {
  'new-dashboard': true,
  'dark-mode': true,
  'experimental-feature': false,
  'premium-features': { enabled: true, variant: 'A' },
};

// 2. Wrap app with provider
function App() {
  return (
    <FeatureFlagProvider flags={flags}>
      <MainApp />
    </FeatureFlagProvider>
  );
}

// 3. Use flags in components
function Dashboard() {
  // Hook-based
  const isNewDashboard = useFeatureFlag('new-dashboard');

  // Component-based
  return (
    <div>
      <FlagGate flag="experimental-feature">
        <ExperimentalWidget />
      </FlagGate>

      {isNewDashboard ? <NewDashboard /> : <LegacyDashboard />}
    </div>
  );
}
```

---

## Provider Setup

### Basic Configuration

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

const flags = {
  'feature-a': true,
  'feature-b': false,
  'feature-c': {
    enabled: true,
    variant: 'control',
  },
};

function App() {
  return (
    <FeatureFlagProvider flags={flags}>
      <MainApp />
    </FeatureFlagProvider>
  );
}
```

### Remote Flag Loading

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

function App() {
  return (
    <FeatureFlagProvider
      endpoint="/api/feature-flags"
      refreshInterval={60000}  // Refresh every minute
      fallbackFlags={{
        'critical-feature': true, // Fallback if API fails
      }}
      onFlagsLoaded={(flags) => {
        console.log('Flags loaded:', flags);
      }}
      onError={(error) => {
        console.error('Failed to load flags:', error);
      }}
    >
      <MainApp />
    </FeatureFlagProvider>
  );
}
```

### Environment-Based Configuration

```tsx
const flags = {
  // Always enabled
  'stable-feature': true,

  // Development only
  'dev-tools': import.meta.env.DEV,

  // Staging and production
  'new-checkout': import.meta.env.PROD || import.meta.env.MODE === 'staging',

  // Production only
  'analytics-v2': import.meta.env.PROD,
};
```

### Provider Options

```typescript
interface FeatureFlagProviderProps {
  // Static flags
  flags?: Record<string, boolean | FlagValue>;

  // Remote loading
  endpoint?: string;
  refreshInterval?: number;
  timeout?: number;

  // Fallback configuration
  fallbackFlags?: Record<string, boolean>;
  defaultValue?: boolean;

  // User context for targeting
  userContext?: UserContext;

  // Callbacks
  onFlagsLoaded?: (flags: FlagMap) => void;
  onFlagEvaluated?: (key: string, value: boolean) => void;
  onError?: (error: Error) => void;

  // Storage
  cacheFlags?: boolean;
  cacheKey?: string;
  cacheTTL?: number;

  children: React.ReactNode;
}
```

---

## Checking Flags

### useFeatureFlag Hook

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Component() {
  // Simple boolean check
  const isEnabled = useFeatureFlag('my-feature');

  // With default value
  const isEnabled2 = useFeatureFlag('my-feature', { defaultValue: false });

  if (isEnabled) {
    return <NewFeature />;
  }

  return <OldFeature />;
}
```

### useFeatureFlags Hook (Multiple)

```tsx
import { useFeatureFlags } from '@/lib/flags';

function Component() {
  // Check multiple flags at once
  const { flags, isLoading } = useFeatureFlags([
    'feature-a',
    'feature-b',
    'feature-c',
  ]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      {flags['feature-a'] && <FeatureA />}
      {flags['feature-b'] && <FeatureB />}
      {flags['feature-c'] && <FeatureC />}
    </div>
  );
}
```

### useFeatureFlagsStatus Hook

```tsx
import { useFeatureFlagsStatus } from '@/lib/flags';

function FlagStatusIndicator() {
  const {
    isLoading,
    isError,
    lastUpdated,
    flagCount,
    refresh,
  } = useFeatureFlagsStatus();

  if (isLoading) {
    return <span>Loading flags...</span>;
  }

  if (isError) {
    return (
      <span>
        Failed to load flags
        <button onClick={refresh}>Retry</button>
      </span>
    );
  }

  return (
    <span>
      {flagCount} flags loaded
      (updated {formatRelative(lastUpdated)})
    </span>
  );
}
```

### Type-Safe Flag Keys

```tsx
// lib/flags/flagKeys.ts
export const flagKeys = {
  newDashboard: 'new-dashboard',
  darkMode: 'dark-mode',
  experimentalFeatures: 'experimental-features',
  premiumFeatures: 'premium-features',
  analyticsV2: 'analytics-v2',
} as const;

export type FlagKey = typeof flagKeys[keyof typeof flagKeys];

// Usage with type safety
import { flagKeys } from '@/lib/flags';

const isEnabled = useFeatureFlag(flagKeys.newDashboard);
```

---

## Component-Based Gates

### FlagGate Component

```tsx
import { FlagGate } from '@/lib/flags';

function Dashboard() {
  return (
    <div>
      {/* Simple gate */}
      <FlagGate flag="new-widget">
        <NewWidget />
      </FlagGate>

      {/* With fallback */}
      <FlagGate
        flag="new-navigation"
        fallback={<LegacyNavigation />}
      >
        <NewNavigation />
      </FlagGate>

      {/* Loading state */}
      <FlagGate
        flag="async-feature"
        loading={<Skeleton />}
        fallback={<OldFeature />}
      >
        <NewFeature />
      </FlagGate>
    </div>
  );
}
```

### FlagGateAll (All Flags Required)

```tsx
import { FlagGateAll } from '@/lib/flags';

function PremiumFeature() {
  return (
    <FlagGateAll
      flags={['premium-enabled', 'feature-x', 'beta-access']}
      fallback={<UpgradePrompt />}
    >
      <PremiumContent />
    </FlagGateAll>
  );
}
```

### FlagGateAny (Any Flag Required)

```tsx
import { FlagGateAny } from '@/lib/flags';

function ExperimentalFeature() {
  return (
    <FlagGateAny
      flags={['experiment-a', 'experiment-b', 'beta-user']}
      fallback={<StandardFeature />}
    >
      <ExperimentalContent />
    </FlagGateAny>
  );
}
```

### Nested Gates

```tsx
function ComplexFeature() {
  return (
    <FlagGate flag="feature-enabled">
      <FeatureWrapper>
        <Header />

        <FlagGate flag="feature-sidebar">
          <Sidebar />
        </FlagGate>

        <Content>
          <FlagGate flag="feature-widget-a">
            <WidgetA />
          </FlagGate>

          <FlagGate flag="feature-widget-b">
            <WidgetB />
          </FlagGate>
        </Content>
      </FeatureWrapper>
    </FlagGate>
  );
}
```

---

## HOC Pattern

### withFeatureFlag HOC

```tsx
import { withFeatureFlag } from '@/lib/flags';

// Wrap component with feature flag
const NewDashboard = withFeatureFlag(
  'new-dashboard',
  NewDashboardComponent,
  LegacyDashboardComponent // Optional fallback
);

// Usage
function App() {
  return <NewDashboard />;
}
```

### withoutFeatureFlag HOC

```tsx
import { withoutFeatureFlag } from '@/lib/flags';

// Show component only when flag is OFF
const DeprecationWarning = withoutFeatureFlag(
  'new-feature-migrated',
  DeprecationWarningComponent
);

function App() {
  return (
    <div>
      <DeprecationWarning />
      <MainContent />
    </div>
  );
}
```

### Multiple Flags HOC

```tsx
import { withFeatureFlags } from '@/lib/flags';

const AdvancedFeature = withFeatureFlags(
  ['feature-a', 'feature-b'],
  {
    requireAll: true, // or false for any
    fallback: BasicFeature,
    loading: LoadingComponent,
  }
)(AdvancedFeatureComponent);
```

---

## Flag Sources

### Static Flags

```tsx
// Defined at build time
const flags = {
  'feature-a': true,
  'feature-b': false,
};

<FeatureFlagProvider flags={flags}>
```

### Environment Variables

```tsx
// From .env files
const flags = {
  'debug-mode': import.meta.env.VITE_ENABLE_DEBUG === 'true',
  'analytics': import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  'new-feature': import.meta.env.VITE_FEATURE_NEW === 'true',
};
```

### Remote API

```tsx
// From API endpoint
<FeatureFlagProvider
  endpoint="/api/flags"
  refreshInterval={60000}
/>

// API response format
{
  "flags": {
    "feature-a": true,
    "feature-b": {
      "enabled": true,
      "variant": "treatment",
      "payload": { "color": "blue" }
    }
  }
}
```

### LaunchDarkly Integration

```tsx
import { createLaunchDarklyProvider } from '@/lib/flags/integrations';

const LDFlagProvider = createLaunchDarklyProvider({
  clientId: process.env.VITE_LD_CLIENT_ID,
  user: {
    key: user.id,
    email: user.email,
    custom: {
      plan: user.plan,
      company: user.companyId,
    },
  },
});

<LDFlagProvider>
  <App />
</LDFlagProvider>
```

### Unleash Integration

```tsx
import { createUnleashProvider } from '@/lib/flags/integrations';

const UnleashProvider = createUnleashProvider({
  url: 'https://unleash.example.com/api',
  clientKey: process.env.VITE_UNLEASH_KEY,
  appName: 'my-app',
  refreshInterval: 30,
});

<UnleashProvider>
  <App />
</UnleashProvider>
```

---

## Targeting Rules

### User Targeting

```tsx
// Define user context
const userContext = {
  id: user.id,
  email: user.email,
  role: user.role,
  plan: user.subscription.plan,
  createdAt: user.createdAt,
  attributes: {
    company: user.companyId,
    country: user.country,
    betaUser: user.betaAccess,
  },
};

<FeatureFlagProvider
  flags={flags}
  userContext={userContext}
>
```

### Percentage Rollout

```tsx
const flags = {
  'new-checkout': {
    enabled: true,
    rollout: {
      percentage: 25,       // 25% of users
      attribute: 'userId',  // Consistent bucketing
    },
  },
};

// Users are consistently assigned to same bucket
// based on hash of userId
```

### Attribute-Based Targeting

```tsx
const flags = {
  'premium-feature': {
    enabled: true,
    rules: [
      // Enable for premium users
      {
        attribute: 'plan',
        operator: 'in',
        values: ['premium', 'enterprise'],
      },
    ],
  },
  'beta-feature': {
    enabled: true,
    rules: [
      // Enable for beta users OR specific emails
      {
        any: [
          { attribute: 'betaUser', operator: 'eq', value: true },
          { attribute: 'email', operator: 'endsWith', value: '@example.com' },
        ],
      },
    ],
  },
};
```

### Segment Targeting

```tsx
const segments = {
  'internal-users': {
    rules: [
      { attribute: 'email', operator: 'endsWith', value: '@mycompany.com' },
    ],
  },
  'power-users': {
    rules: [
      { attribute: 'loginCount', operator: 'gte', value: 100 },
    ],
  },
};

const flags = {
  'internal-feature': {
    enabled: true,
    segments: ['internal-users'],
  },
  'advanced-feature': {
    enabled: true,
    segments: ['power-users', 'internal-users'],
  },
};
```

---

## A/B Testing

### Variant Flags

```tsx
interface VariantFlag {
  enabled: boolean;
  variant: string;
  payload?: unknown;
}

const flags = {
  'checkout-experiment': {
    enabled: true,
    variant: 'B',  // A, B, or control
    payload: {
      buttonColor: 'green',
      showTestimonials: true,
    },
  },
};
```

### useFeatureVariant Hook

```tsx
import { useFeatureVariant } from '@/lib/flags';

function CheckoutButton() {
  const { variant, payload, isEnabled } = useFeatureVariant(
    'checkout-experiment'
  );

  if (!isEnabled) {
    return <StandardCheckout />;
  }

  switch (variant) {
    case 'A':
      return <CheckoutVariantA {...payload} />;
    case 'B':
      return <CheckoutVariantB {...payload} />;
    default:
      return <CheckoutControl />;
  }
}
```

### Multi-Variant Testing

```tsx
const flags = {
  'pricing-page-test': {
    enabled: true,
    variants: {
      control: { weight: 34 },
      monthly: { weight: 33 },
      annual: { weight: 33 },
    },
    payload: {
      control: { showAnnual: false, discount: 0 },
      monthly: { showAnnual: false, discount: 10 },
      annual: { showAnnual: true, discount: 20 },
    },
  },
};

function PricingPage() {
  const { variant, payload } = useFeatureVariant('pricing-page-test');

  return (
    <PricingTable
      showAnnual={payload.showAnnual}
      discount={payload.discount}
    />
  );
}
```

### Analytics Integration

```tsx
import { useFeatureVariant } from '@/lib/flags';
import { useEffect } from 'react';

function ExperimentComponent() {
  const { variant, isEnabled, flagKey } = useFeatureVariant('experiment-x');

  // Track experiment exposure
  useEffect(() => {
    if (isEnabled) {
      analytics.track('Experiment Exposure', {
        experimentId: flagKey,
        variant,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isEnabled, variant, flagKey]);

  // Track conversion
  const handleConversion = () => {
    analytics.track('Experiment Conversion', {
      experimentId: flagKey,
      variant,
    });
  };

  return (
    <div onClick={handleConversion}>
      {variant === 'treatment' ? <TreatmentUI /> : <ControlUI />}
    </div>
  );
}
```

---

## Best Practices

### 1. Naming Conventions

```typescript
// DO: Use kebab-case with descriptive names
'new-checkout-flow'
'dark-mode-enabled'
'premium-analytics-dashboard'

// DON'T: Vague or cryptic names
'flag1'
'test'
'ff_123'

// Recommended pattern: category-feature-modifier
'ui-sidebar-collapsed'
'api-v2-enabled'
'experiment-pricing-annual'
```

### 2. Flag Lifecycle

```typescript
// 1. Create flag in OFF state
'new-feature': false

// 2. Enable for internal testing
'new-feature': {
  enabled: true,
  segments: ['internal-users'],
}

// 3. Gradual rollout
'new-feature': {
  enabled: true,
  rollout: { percentage: 10 },
}

// 4. Full rollout
'new-feature': true

// 5. Remove flag and hardcode feature
// Delete flag, remove FlagGate, keep new code
```

### 3. Default Values

```tsx
// Always provide sensible defaults
const isEnabled = useFeatureFlag('new-feature', {
  defaultValue: false, // Conservative default
});

// For critical features, default to current behavior
const useNewAPI = useFeatureFlag('new-api', {
  defaultValue: false, // Keep using old API if flag fails
});
```

### 4. Testing with Flags

```tsx
// Test utilities
import { FlagTestProvider } from '@/lib/flags/testing';

describe('NewFeature', () => {
  it('renders when flag is enabled', () => {
    render(
      <FlagTestProvider flags={{ 'new-feature': true }}>
        <MyComponent />
      </FlagTestProvider>
    );

    expect(screen.getByText('New Feature')).toBeInTheDocument();
  });

  it('renders fallback when flag is disabled', () => {
    render(
      <FlagTestProvider flags={{ 'new-feature': false }}>
        <MyComponent />
      </FlagTestProvider>
    );

    expect(screen.getByText('Old Feature')).toBeInTheDocument();
  });
});
```

### 5. Cleanup Old Flags

```tsx
// Track flag creation date in comments
const flags = {
  // Created: 2024-01-15, Owner: @john
  // TODO: Remove after 2024-03-15 if successful
  'new-checkout-v2': true,

  // Created: 2023-06-01, Owner: @jane
  // DEPRECATED: Remove this flag - feature fully rolled out
  'new-dashboard': true,
};

// Regular cleanup process
// 1. Review flags older than 30 days
// 2. Remove flags at 100% rollout
// 3. Delete associated FlagGate code
// 4. Update documentation
```

### 6. Flag Documentation

```tsx
/**
 * Feature Flags Documentation
 *
 * new-checkout-v2
 * - Description: New checkout flow with improved UX
 * - Owner: @checkout-team
 * - Created: 2024-01-15
 * - Rollout: 50% -> 100% by Feb 2024
 * - Dependencies: payment-api-v2
 * - Cleanup: Remove after stable for 2 weeks
 *
 * premium-analytics
 * - Description: Advanced analytics for premium users
 * - Owner: @analytics-team
 * - Type: Permanent (user segment)
 * - Segments: premium, enterprise
 */
```

---

## Type Definitions

```typescript
type FlagValue = boolean | {
  enabled: boolean;
  variant?: string;
  payload?: unknown;
  rollout?: RolloutConfig;
  rules?: TargetingRule[];
  segments?: string[];
};

interface RolloutConfig {
  percentage: number;
  attribute?: string;
}

interface TargetingRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'gte' | 'lt' | 'lte' |
            'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

interface UserContext {
  id: string;
  email?: string;
  role?: string;
  attributes?: Record<string, unknown>;
}

interface UseFeatureFlagOptions {
  defaultValue?: boolean;
}

interface UseFeatureVariantResult {
  isEnabled: boolean;
  variant: string | null;
  payload: unknown;
  flagKey: string;
}
```

---

## See Also

- [README](../README.md) - Library overview
- [RBAC Guide](./RBAC.md) - Permission-based access
- [Configuration Guide](./CONFIGURATION.md) - Environment setup
- [Documentation Index](./INDEX.md) - All documentation resources
