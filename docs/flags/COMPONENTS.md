# Feature Flag Components

Documentation for declarative feature flag components in @missionfabric-js/enzyme.

## Table of Contents

- [FlagGate](#flaggate)
- [withFeatureFlag HOC](#withfeatureflag-hoc)
- [Conditional Rendering Patterns](#conditional-rendering-patterns)
- [Advanced Usage](#advanced-usage)
- [Testing](#testing)

## FlagGate

**Location**: `/home/user/enzyme/src/lib/flags/FlagGate.tsx`

Declarative component for conditional rendering based on feature flags.

### Basic Usage

```tsx
import { FlagGate } from '@/lib/flags';

function Dashboard() {
  return (
    <div>
      <FlagGate flagKey="new-dashboard">
        <NewDashboard />
      </FlagGate>
    </div>
  );
}
```

### With Fallback

```tsx
<FlagGate
  flagKey="premium-feature"
  fallback={<UpgradePrompt />}
>
  <PremiumContent />
</FlagGate>
```

### Props

```typescript
interface FlagGateProps {
  /** Flag key to evaluate */
  flagKey: string;

  /** Content to render when flag is enabled */
  children: React.ReactNode;

  /** Content to render when flag is disabled */
  fallback?: React.ReactNode;

  /** Invert the flag check */
  negate?: boolean;

  /** Require all flags (if multiple) */
  requireAll?: boolean;

  /** Custom evaluation context */
  context?: Partial<EvaluationContext>;

  /** Render prop for more control */
  render?: (enabled: boolean) => React.ReactNode;
}
```

### Multiple Flags

```tsx
<FlagGate
  flagKey={['feature-a', 'feature-b']}
  requireAll={true}
>
  <RequiresBothFeatures />
</FlagGate>

<FlagGate
  flagKey={['feature-a', 'feature-b']}
  requireAll={false}
>
  <RequiresEitherFeature />
</FlagGate>
```

### Negation

```tsx
<FlagGate flagKey="maintenance-mode" negate>
  <NormalOperation />
</FlagGate>

<FlagGate flagKey="maintenance-mode">
  <MaintenanceBanner />
</FlagGate>
```

### Render Props

```tsx
<FlagGate
  flagKey="beta-feature"
  render={(enabled) => (
    <div className={enabled ? 'beta' : 'stable'}>
      {enabled ? <BetaFeature /> : <StableFeature />}
    </div>
  )}
/>
```

### With Context

```tsx
<FlagGate
  flagKey="user-specific-feature"
  context={{
    userId: currentUser.id,
    customAttributes: {
      subscription: currentUser.subscription
    }
  }}
>
  <UserFeature />
</FlagGate>
```

### Loading State

```tsx
import { Suspense } from 'react';

<Suspense fallback={<Spinner />}>
  <FlagGate flagKey="async-feature">
    <AsyncFeature />
  </FlagGate>
</Suspense>
```

## withFeatureFlag HOC

**Location**: `/home/user/enzyme/src/lib/flags/withFeatureFlag.tsx`

Higher-Order Component for wrapping components with feature flag logic.

### Basic Usage

```tsx
import { withFeatureFlag } from '@/lib/flags';

const EnhancedComponent = withFeatureFlag('new-feature')(MyComponent);

function App() {
  return <EnhancedComponent />;
}
```

### With Options

```tsx
const EnhancedComponent = withFeatureFlag('premium-feature', {
  fallback: <UpgradePrompt />,
  loading: <Spinner />,
  displayName: 'PremiumComponent'
})(PremiumComponent);
```

### Type Definition

```typescript
interface WithFeatureFlagOptions {
  /** Component to render when flag is disabled */
  fallback?: React.ReactNode;

  /** Component to render while loading */
  loading?: React.ReactNode;

  /** Invert the flag check */
  negate?: boolean;

  /** Custom display name for debugging */
  displayName?: string;

  /** Custom evaluation context */
  context?: Partial<EvaluationContext>;

  /** Inject flag state as props */
  injectFlagState?: boolean;
}

function withFeatureFlag<P extends object>(
  flagKey: string,
  options?: WithFeatureFlagOptions
): (Component: React.ComponentType<P>) => React.ComponentType<P>;
```

### Multiple Flags

```tsx
const EnhancedComponent = withFeatureFlag(['feature-a', 'feature-b'], {
  requireAll: true
})(MyComponent);
```

### Inject Flag State

```tsx
interface Props {
  flagEnabled?: boolean;
  flagMetadata?: FlagMetadata;
}

const EnhancedComponent = withFeatureFlag('my-feature', {
  injectFlagState: true
})<Props>(({ flagEnabled, flagMetadata }) => {
  return (
    <div>
      <div>Flag Enabled: {flagEnabled ? 'Yes' : 'No'}</div>
      <div>Flag Name: {flagMetadata?.name}</div>
    </div>
  );
});
```

### Composition

```tsx
const withAuth = withFeatureFlag('auth-required');
const withPremium = withFeatureFlag('premium-feature');

const EnhancedComponent = compose(
  withAuth,
  withPremium
)(MyComponent);
```

### Conditional Props

```tsx
interface ComponentProps {
  mode: 'basic' | 'advanced';
}

const EnhancedComponent = withFeatureFlag<ComponentProps>('advanced-mode', {
  fallback: null
})((props) => {
  const mode = props.mode || 'basic';
  return <Component mode={mode} />;
});
```

## Conditional Rendering Patterns

### Basic Conditional

```tsx
import { useFeatureFlag } from '@/lib/flags';

function Feature() {
  const isEnabled = useFeatureFlag('new-feature');

  if (!isEnabled) {
    return null;
  }

  return <NewFeature />;
}
```

### Ternary Operator

```tsx
function Feature() {
  const isEnabled = useFeatureFlag('new-ui');

  return isEnabled ? <NewUI /> : <OldUI />;
}
```

### Early Return

```tsx
function Feature() {
  const isEnabled = useFeatureFlag('feature');

  if (!isEnabled) {
    return <Fallback />;
  }

  // Feature implementation
  return <Implementation />;
}
```

### Conditional Sections

```tsx
function Dashboard() {
  const showAnalytics = useFeatureFlag('analytics');
  const showReports = useFeatureFlag('reports');

  return (
    <div>
      <Header />

      {showAnalytics && (
        <section>
          <Analytics />
        </section>
      )}

      {showReports && (
        <section>
          <Reports />
        </section>
      )}

      <Footer />
    </div>
  );
}
```

### Nested Conditions

```tsx
function ComplexFeature() {
  const parentFlag = useFeatureFlag('parent-feature');
  const childFlag = useFeatureFlag('child-feature');

  if (!parentFlag) return null;

  return (
    <div>
      <ParentFeature />
      {childFlag && <ChildFeature />}
    </div>
  );
}
```

### Switch Statement

```tsx
import { useVariant } from '@/lib/flags';

function ExperimentalFeature() {
  const variant = useVariant('ab-test');

  switch (variant?.id) {
    case 'variant-a':
      return <VariantA />;
    case 'variant-b':
      return <VariantB />;
    case 'control':
    default:
      return <Control />;
  }
}
```

## Advanced Usage

### Lazy Loading with Flags

```tsx
import { lazy, Suspense } from 'react';
import { FlagGate } from '@/lib/flags';

const HeavyFeature = lazy(() => import('./HeavyFeature'));

function App() {
  return (
    <FlagGate flagKey="heavy-feature">
      <Suspense fallback={<Loading />}>
        <HeavyFeature />
      </Suspense>
    </FlagGate>
  );
}
```

### Code Splitting by Flag

```tsx
import { useFeatureFlag } from '@/lib/flags';

function DynamicImport() {
  const useNewVersion = useFeatureFlag('new-version');

  const Component = lazy(() =>
    useNewVersion
      ? import('./NewVersion')
      : import('./OldVersion')
  );

  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}
```

### Gradual Migration

```tsx
function MigratingFeature() {
  const rolloutPercentage = useFlagValue<number>('migration-rollout');

  return (
    <FlagGate
      flagKey="migration-complete"
      fallback={
        <ProgressiveMigration percentage={rolloutPercentage} />
      }
    >
      <NewImplementation />
    </FlagGate>
  );
}
```

### Feature Toggle with Analytics

```tsx
import { FlagGate } from '@/lib/flags';
import { useFlagAnalytics } from '@/lib/flags/integration';

function TrackedFeature() {
  const { trackExposure } = useFlagAnalytics();

  return (
    <FlagGate
      flagKey="tracked-feature"
      render={(enabled) => {
        useEffect(() => {
          trackExposure('tracked-feature', { enabled });
        }, [enabled]);

        return enabled ? <NewFeature /> : <OldFeature />;
      }}
    />
  );
}
```

### Contextual Feature Gates

```tsx
function UserContextualFeature() {
  const user = useCurrentUser();

  return (
    <FlagGate
      flagKey="premium-feature"
      context={{
        userId: user.id,
        customAttributes: {
          subscription: user.subscription,
          region: user.region
        }
      }}
    >
      <PremiumContent />
    </FlagGate>
  );
}
```

### Compound Gates

```tsx
function ComplexGate() {
  return (
    <FlagGate flagKey="parent-feature">
      <FlagGate
        flagKey={['child-a', 'child-b']}
        requireAll={false}
      >
        <NestedFeature />
      </FlagGate>
    </FlagGate>
  );
}
```

## Testing

### Testing FlagGate

```tsx
import { render, screen } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';
import { FlagGate } from '@/lib/flags';

describe('FlagGate', () => {
  it('renders children when flag is enabled', () => {
    render(
      <FeatureFlagProvider
        flags={[{ key: 'test-flag', enabled: true, defaultValue: true }]}
      >
        <FlagGate flagKey="test-flag">
          <div>Feature Content</div>
        </FlagGate>
      </FeatureFlagProvider>
    );

    expect(screen.getByText('Feature Content')).toBeInTheDocument();
  });

  it('renders fallback when flag is disabled', () => {
    render(
      <FeatureFlagProvider
        flags={[{ key: 'test-flag', enabled: true, defaultValue: false }]}
      >
        <FlagGate
          flagKey="test-flag"
          fallback={<div>Fallback Content</div>}
        >
          <div>Feature Content</div>
        </FlagGate>
      </FeatureFlagProvider>
    );

    expect(screen.getByText('Fallback Content')).toBeInTheDocument();
    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
  });
});
```

### Testing HOC

```tsx
import { withFeatureFlag } from '@/lib/flags';

const TestComponent = () => <div>Test Component</div>;
const EnhancedComponent = withFeatureFlag('test-flag')(TestComponent);

describe('withFeatureFlag', () => {
  it('renders component when flag is enabled', () => {
    render(
      <FeatureFlagProvider
        flags={[{ key: 'test-flag', enabled: true, defaultValue: true }]}
      >
        <EnhancedComponent />
      </FeatureFlagProvider>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('renders fallback when flag is disabled', () => {
    const Enhanced = withFeatureFlag('test-flag', {
      fallback: <div>Disabled</div>
    })(TestComponent);

    render(
      <FeatureFlagProvider
        flags={[{ key: 'test-flag', enabled: true, defaultValue: false }]}
      >
        <Enhanced />
      </FeatureFlagProvider>
    );

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });
});
```

### Test Utilities

```tsx
// test-utils.tsx
import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

export function renderWithFlag(
  ui: ReactElement,
  flagKey: string,
  enabled: boolean
) {
  return render(
    <FeatureFlagProvider
      flags={[{ key: flagKey, enabled: true, defaultValue: enabled }]}
    >
      {ui}
    </FeatureFlagProvider>
  );
}

// Usage
renderWithFlag(<MyComponent />, 'my-flag', true);
```

## Performance Optimization

### Memoization

```tsx
import { memo } from 'react';

const ExpensiveFeature = memo(function ExpensiveFeature() {
  const isEnabled = useFeatureFlag('expensive');

  if (!isEnabled) return null;

  return <ExpensiveComponent />;
});
```

### Lazy Evaluation

```tsx
function ConditionalRender() {
  const isEnabled = useFeatureFlag('feature');

  // Don't evaluate expensive computation unless enabled
  const expensiveValue = useMemo(
    () => (isEnabled ? computeExpensiveValue() : null),
    [isEnabled]
  );

  if (!isEnabled) return null;

  return <Feature value={expensiveValue} />;
}
```

## See Also

- [HOOKS.md](./HOOKS.md) - Feature flag hooks
- [PROVIDER.md](./PROVIDER.md) - Provider configuration
- [README.md](./README.md) - Feature flags overview
