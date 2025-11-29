# Conditional Rendering with Feature Flags

Comprehensive patterns and techniques for conditional rendering using feature flags in @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Basic Patterns](#basic-patterns)
- [Component-Based Rendering](#component-based-rendering)
- [Hook-Based Rendering](#hook-based-rendering)
- [HOC Pattern](#hoc-pattern)
- [Advanced Patterns](#advanced-patterns)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)
- [Common Use Cases](#common-use-cases)

## Overview

Conditional rendering allows you to show or hide components, features, or UI elements based on feature flag values. This enables gradual rollouts, A/B testing, and dynamic feature management without code deployments.

### Key Benefits

- **Zero Downtime Deployments**: Ship code hidden behind flags
- **Gradual Rollouts**: Progressive feature enablement
- **A/B Testing**: Test multiple variants simultaneously
- **User Segmentation**: Different features for different user groups
- **Quick Rollback**: Disable features instantly without deployment

## Basic Patterns

### Simple Boolean Flag

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Dashboard() {
  const newDashboard = useFeatureFlag('new-dashboard');

  return newDashboard ? <NewDashboard /> : <OldDashboard />;
}
```

### Inline Conditional

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Header() {
  const showNotifications = useFeatureFlag('notifications');

  return (
    <header>
      <Logo />
      <Navigation />
      {showNotifications && <NotificationBell />}
    </header>
  );
}
```

### Multiple Flags

```tsx
import { useFeatureFlags } from '@/lib/flags';

function Features() {
  const { flags } = useFeatureFlags([
    'feature-a',
    'feature-b',
    'feature-c',
  ]);

  return (
    <div>
      {flags['feature-a'] && <FeatureA />}
      {flags['feature-b'] && <FeatureB />}
      {flags['feature-c'] && <FeatureC />}
    </div>
  );
}
```

## Component-Based Rendering

### FlagGate Component

```tsx
import { FlagGate } from '@/lib/flags';

function App() {
  return (
    <div>
      {/* Simple gate */}
      <FlagGate flagKey="new-feature">
        <NewFeature />
      </FlagGate>

      {/* With fallback */}
      <FlagGate
        flagKey="premium-feature"
        fallback={<UpgradePrompt />}
      >
        <PremiumContent />
      </FlagGate>

      {/* With loading state */}
      <FlagGate
        flagKey="async-feature"
        loading={<Skeleton />}
        fallback={<ComingSoon />}
      >
        <AsyncFeature />
      </FlagGate>
    </div>
  );
}
```

### FlagGateAll (Require All Flags)

```tsx
import { FlagGateAll } from '@/lib/flags';

function PremiumDashboard() {
  return (
    <FlagGateAll
      flags={['premium-plan', 'advanced-features', 'beta-access']}
      fallback={<StandardDashboard />}
    >
      <AdvancedDashboard />
    </FlagGateAll>
  );
}
```

### FlagGateAny (Require Any Flag)

```tsx
import { FlagGateAny } from '@/lib/flags';

function ExperimentalSection() {
  return (
    <FlagGateAny
      flags={['experiment-a', 'experiment-b', 'beta-tester']}
      fallback={<StandardSection />}
    >
      <ExperimentalContent />
    </FlagGateAny>
  );
}
```

### Nested Gates

```tsx
import { FlagGate } from '@/lib/flags';

function ComplexFeature() {
  return (
    <FlagGate flagKey="feature-enabled">
      <FeatureContainer>
        <FlagGate flagKey="feature-sidebar">
          <Sidebar />
        </FlagGate>

        <MainContent>
          <FlagGate flagKey="feature-advanced-settings">
            <AdvancedSettings />
          </FlagGate>
        </MainContent>
      </FeatureContainer>
    </FlagGate>
  );
}
```

## Hook-Based Rendering

### useFeatureFlag Hook

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Navigation() {
  const newNav = useFeatureFlag('new-navigation');

  return (
    <nav>
      {newNav ? (
        <NewNavigation />
      ) : (
        <LegacyNavigation />
      )}
    </nav>
  );
}
```

### Multiple Conditions

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Dashboard() {
  const hasNewDashboard = useFeatureFlag('new-dashboard');
  const hasAnalytics = useFeatureFlag('analytics');
  const hasReports = useFeatureFlag('reports');

  return (
    <div>
      <Header />

      {hasNewDashboard && <NewDashboardLayout />}

      {hasAnalytics && (
        <section>
          <h2>Analytics</h2>
          <AnalyticsPanel />
        </section>
      )}

      {hasReports && (
        <section>
          <h2>Reports</h2>
          <ReportsPanel />
        </section>
      )}
    </div>
  );
}
```

### Switch Statement

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Checkout() {
  const checkoutVariant = useFeatureFlag('checkout-variant');

  switch (checkoutVariant) {
    case 'express':
      return <ExpressCheckout />;
    case 'onepage':
      return <OnePageCheckout />;
    case 'wizard':
      return <WizardCheckout />;
    default:
      return <StandardCheckout />;
  }
}
```

### Early Return

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Feature() {
  const isEnabled = useFeatureFlag('feature');

  if (!isEnabled) {
    return <FeatureDisabled />;
  }

  return (
    <div>
      <FeatureHeader />
      <FeatureContent />
      <FeatureFooter />
    </div>
  );
}
```

## HOC Pattern

### withFeatureFlag

```tsx
import { withFeatureFlag } from '@/lib/flags';

const EnhancedFeature = withFeatureFlag(
  'new-feature',
  NewFeatureComponent,
  LegacyFeatureComponent // Optional fallback
);

// Usage
function App() {
  return <EnhancedFeature />;
}
```

### Multiple HOCs

```tsx
import { withFeatureFlag } from '@/lib/flags';
import { withAuth } from '@/lib/auth';

const SecureNewFeature = withAuth(
  withFeatureFlag(
    'new-feature',
    NewFeatureComponent
  )
);
```

### Compose HOCs

```tsx
import { compose } from '@/lib/utils';
import { withFeatureFlag } from '@/lib/flags';
import { withAuth } from '@/lib/auth';
import { withTracking } from '@/lib/analytics';

const EnhancedComponent = compose(
  withAuth,
  withFeatureFlag('premium-feature'),
  withTracking('feature-view')
)(PremiumComponent);
```

## Advanced Patterns

### Render Props

```tsx
import { FlagConfigurable } from '@/lib/flags';

function CustomComponent() {
  return (
    <FlagConfigurable flagKey="layout-variant">
      {({ isEnabled, variant, isLoading }) => {
        if (isLoading) {
          return <Skeleton />;
        }

        if (!isEnabled) {
          return <DefaultLayout />;
        }

        switch (variant) {
          case 'grid':
            return <GridLayout />;
          case 'list':
            return <ListLayout />;
          default:
            return <DefaultLayout />;
        }
      }}
    </FlagConfigurable>
  );
}
```

### Flag-Driven Code Splitting

```tsx
import { useFeatureFlaggedModule } from '@/lib/flags';

function ChartWidget() {
  const { module: ChartComponent, isLoading } = useFeatureFlaggedModule({
    flagKey: 'new-charts',
    enabledModule: () => import('./NewChart'),
    fallbackModule: () => import('./OldChart'),
  });

  if (isLoading) {
    return <Spinner />;
  }

  return <ChartComponent data={data} />;
}
```

### Dynamic Props

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Button() {
  const variant = useFeatureFlag('button-variant');

  const buttonProps = {
    control: {
      color: 'blue',
      size: 'medium',
      text: 'Click Me',
    },
    'variant-a': {
      color: 'green',
      size: 'large',
      text: 'Get Started',
    },
    'variant-b': {
      color: 'red',
      size: 'medium',
      text: 'Try Now',
    },
  };

  const props = buttonProps[variant] || buttonProps.control;

  return <StyledButton {...props} />;
}
```

### Conditional Routing

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { Navigate, Route, Routes } from 'react-router-dom';

function AppRoutes() {
  const newDashboard = useFeatureFlag('new-dashboard');

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={newDashboard ? <NewDashboard /> : <OldDashboard />}
      />

      <Route
        path="/settings"
        element={
          <FlagGate flagKey="advanced-settings" fallback={<Navigate to="/dashboard" />}>
            <AdvancedSettings />
          </FlagGate>
        }
      />
    </Routes>
  );
}
```

## Performance Optimization

### Memoization

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { useMemo } from 'react';

function OptimizedComponent() {
  const variant = useFeatureFlag('expensive-feature');

  const Component = useMemo(() => {
    switch (variant) {
      case 'variant-a':
        return VariantA;
      case 'variant-b':
        return VariantB;
      default:
        return Control;
    }
  }, [variant]);

  return <Component />;
}
```

### Lazy Loading with Flags

```tsx
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/lib/flags';

const NewFeature = lazy(() => import('./NewFeature'));
const OldFeature = lazy(() => import('./OldFeature'));

function Feature() {
  const useNewFeature = useFeatureFlag('new-feature');

  return (
    <Suspense fallback={<Loading />}>
      {useNewFeature ? <NewFeature /> : <OldFeature />}
    </Suspense>
  );
}
```

### Avoiding Re-renders

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { memo } from 'react';

const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  const showDetails = useFeatureFlag('show-details');

  return (
    <div>
      <Summary data={data} />
      {showDetails && <Details data={data} />}
    </div>
  );
});
```

## Best Practices

### 1. Clear Naming

```tsx
// Good: Descriptive flag names
const newCheckoutFlow = useFeatureFlag('checkout-flow-v2');
const enhancedSearch = useFeatureFlag('enhanced-search');
const betaFeatures = useFeatureFlag('beta-features-enabled');

// Bad: Vague names
const flag1 = useFeatureFlag('flag1');
const test = useFeatureFlag('test');
```

### 2. Provide Fallbacks

```tsx
// Good: Always have fallback
<FlagGate flagKey="feature" fallback={<DefaultUI />}>
  <NewFeature />
</FlagGate>

// Bad: No fallback (shows nothing if disabled)
<FlagGate flagKey="feature">
  <NewFeature />
</FlagGate>
```

### 3. Handle Loading States

```tsx
// Good: Handle loading state
<FlagGate
  flagKey="feature"
  loading={<Skeleton />}
  fallback={<Default />}
>
  <Feature />
</FlagGate>

// Bad: No loading state (flash of content)
<FlagGate flagKey="feature" fallback={<Default />}>
  <Feature />
</FlagGate>
```

### 4. Cleanup Old Flags

```tsx
// Before cleanup (with flag)
function Component() {
  const newFeature = useFeatureFlag('new-feature');
  return newFeature ? <NewFeature /> : <OldFeature />;
}

// After cleanup (flag fully rolled out)
function Component() {
  return <NewFeature />;
}
```

### 5. Test Both Paths

```tsx
import { render } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

describe('Feature', () => {
  it('renders new feature when enabled', () => {
    render(
      <FeatureFlagProvider flags={{ 'new-feature': true }}>
        <Feature />
      </FeatureFlagProvider>
    );
    // Assert new feature is rendered
  });

  it('renders old feature when disabled', () => {
    render(
      <FeatureFlagProvider flags={{ 'new-feature': false }}>
        <Feature />
      </FeatureFlagProvider>
    );
    // Assert old feature is rendered
  });
});
```

## Common Use Cases

### Beta Features

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { useAuth } from '@/lib/auth';

function BetaFeatures() {
  const isBetaUser = useFeatureFlag('beta-access');
  const { user } = useAuth();

  if (!isBetaUser && !user?.betaTester) {
    return null;
  }

  return (
    <section>
      <h2>Beta Features</h2>
      <BetaFeatureList />
    </section>
  );
}
```

### Premium Features

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { useAuth } from '@/lib/auth';

function PremiumContent() {
  const { user } = useAuth();
  const premiumEnabled = useFeatureFlag('premium-content');

  if (!user?.isPremium || !premiumEnabled) {
    return <UpgradeToPremium />;
  }

  return <PremiumFeatures />;
}
```

### Gradual Rollout

```tsx
import { useFeatureFlag } from '@/lib/flags';

function NewFeature() {
  // Feature rolled out to 25% of users
  const isEnabled = useFeatureFlag('gradual-rollout-feature');

  if (!isEnabled) {
    return <CurrentFeature />;
  }

  return <NewFeatureImplementation />;
}
```

### Environment-Specific Features

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { env } from '@/config';

function DebugTools() {
  const debugEnabled = useFeatureFlag('debug-tools');

  // Only show in development or if flag is enabled
  if (!env.isDev && !debugEnabled) {
    return null;
  }

  return <DebugPanel />;
}
```

## See Also

- [Feature Flags Overview](./README.md) - Main feature flags documentation
- [A/B Testing](./AB_TESTING.md) - A/B testing guide
- [Hooks Reference](./HOOKS.md) - Flag hooks API
- [Components Reference](./COMPONENTS.md) - Flag components

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
