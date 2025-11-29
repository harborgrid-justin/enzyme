# Feature Flag Hooks

Complete documentation for feature flag React hooks in @missionfabric-js/enzyme.

## Table of Contents

- [useFeatureFlag](#usefeatureflag)
- [Type Safety](#type-safety)
- [Usage Patterns](#usage-patterns)
- [Performance](#performance)
- [Testing](#testing)

## useFeatureFlag

**Location**: `/home/user/enzyme/src/lib/flags/useFeatureFlag.ts`

Primary hook for accessing feature flag values in React components.

### Basic Usage

```tsx
import { useFeatureFlag } from '@/lib/flags';

function MyComponent() {
  const isEnabled = useFeatureFlag('new-feature');

  return isEnabled ? <NewFeature /> : <OldFeature />;
}
```

### Type Definition

```typescript
function useFeatureFlag(
  flagKey: string,
  options?: UseFeatureFlagOptions
): boolean;

interface UseFeatureFlagOptions {
  /** Default value if flag not found */
  defaultValue?: boolean;

  /** Custom evaluation context */
  context?: Partial<EvaluationContext>;

  /** Track flag exposure for analytics */
  trackExposure?: boolean;

  /** Suspend component while loading */
  suspense?: boolean;
}
```

### With Default Value

```tsx
function Feature() {
  const isEnabled = useFeatureFlag('optional-feature', {
    defaultValue: false
  });

  return isEnabled ? <OptionalContent /> : null;
}
```

### With Context

```tsx
function UserSpecificFeature() {
  const user = useCurrentUser();

  const isEnabled = useFeatureFlag('user-feature', {
    context: {
      userId: user.id,
      customAttributes: {
        subscription: user.subscription
      }
    }
  });

  return isEnabled ? <Feature /> : null;
}
```

### With Analytics Tracking

```tsx
function TrackedFeature() {
  const isEnabled = useFeatureFlag('tracked-feature', {
    trackExposure: true
  });

  return isEnabled ? <Feature /> : null;
}
```

### With Suspense

```tsx
import { Suspense } from 'react';

function AsyncFeature() {
  const isEnabled = useFeatureFlag('async-feature', {
    suspense: true
  });

  return isEnabled ? <Feature /> : null;
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <AsyncFeature />
    </Suspense>
  );
}
```

## Advanced Hook Patterns

### useFeatureFlagValue

Get typed flag values (not just boolean):

```tsx
import { useFlagValue } from '@/lib/flags';

function ConfigurableFeature() {
  const config = useFlagValue<FeatureConfig>('feature-config');

  return <Feature config={config} />;
}
```

### useVariant

Get the current variant for A/B testing:

```tsx
import { useVariant } from '@/lib/flags';

function ExperimentalFeature() {
  const variant = useVariant('ab-test');

  switch (variant?.id) {
    case 'variant-a':
      return <VariantA />;
    case 'variant-b':
      return <VariantB />;
    default:
      return <Control />;
  }
}
```

### useFlagMetadata

Access flag metadata:

```tsx
import { useFlagMetadata } from '@/lib/flags';

function FeatureInfo() {
  const metadata = useFlagMetadata('my-feature');

  return (
    <div>
      <h3>{metadata?.name}</h3>
      <p>{metadata?.description}</p>
      <div>Tags: {metadata?.tags?.join(', ')}</div>
    </div>
  );
}
```

### useFlags

Get multiple flags at once:

```tsx
import { useFlags } from '@/lib/flags';

function Dashboard() {
  const flags = useFlags([
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

### useAllFlags

Get all available flags:

```tsx
import { useAllFlags } from '@/lib/flags';

function FlagDebugPanel() {
  const allFlags = useAllFlags();

  return (
    <div>
      {allFlags.map((flag) => (
        <FlagRow key={flag.key} flag={flag} />
      ))}
    </div>
  );
}
```

### useFlagOverride

Override flags for testing/debugging:

```tsx
import { useFlagOverride } from '@/lib/flags';

function DebugPanel() {
  const [override, setOverride] = useFlagOverride('my-feature');

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={override ?? false}
          onChange={(e) => setOverride(e.target.checked)}
        />
        Override my-feature
      </label>
    </div>
  );
}
```

## Type Safety

### Typed Flag Keys

```typescript
// flag-keys.ts
export const FLAG_KEYS = {
  NEW_DASHBOARD: 'new-dashboard',
  BETA_FEATURES: 'beta-features',
  PREMIUM_CONTENT: 'premium-content'
} as const;

export type FlagKey = typeof FLAG_KEYS[keyof typeof FLAG_KEYS];
```

```tsx
// Usage
import { FLAG_KEYS } from './flag-keys';

function Dashboard() {
  const isEnabled = useFeatureFlag(FLAG_KEYS.NEW_DASHBOARD);
  return isEnabled ? <NewDashboard /> : <OldDashboard />;
}
```

### Typed Flag Values

```typescript
// types.ts
interface FeatureConfigs {
  'checkout-flow': {
    steps: number;
    showProgressBar: boolean;
  };
  'theme-settings': {
    primaryColor: string;
    darkMode: boolean;
  };
}

// Hook
function useTypedFlagValue<K extends keyof FeatureConfigs>(
  key: K
): FeatureConfigs[K] | undefined {
  return useFlagValue<FeatureConfigs[K]>(key);
}
```

```tsx
// Usage
function Checkout() {
  const config = useTypedFlagValue('checkout-flow');

  return <CheckoutFlow steps={config?.steps ?? 3} />;
}
```

### Generic Flag Hook

```typescript
function useTypedFeatureFlag<T = boolean>(
  flagKey: string,
  options?: UseFeatureFlagOptions
): T {
  const value = useFlagValue<T>(flagKey, options);
  return value as T;
}
```

```tsx
const isEnabled = useTypedFeatureFlag<boolean>('flag-name');
const config = useTypedFeatureFlag<Config>('config-flag');
```

## Usage Patterns

### Conditional Hooks

```tsx
function ConditionalFeature() {
  const parentEnabled = useFeatureFlag('parent-feature');

  // Only call expensive hook if parent is enabled
  const childEnabled = parentEnabled
    ? useFeatureFlag('child-feature')
    : false;

  if (!parentEnabled) return null;

  return childEnabled ? <ChildFeature /> : <ParentOnly />;
}
```

### Flag Combinations

```tsx
function CombinedFeatures() {
  const featureA = useFeatureFlag('feature-a');
  const featureB = useFeatureFlag('feature-b');

  // Require both
  const bothEnabled = featureA && featureB;

  // Require either
  const eitherEnabled = featureA || featureB;

  return (
    <div>
      {bothEnabled && <BothFeatures />}
      {eitherEnabled && <EitherFeature />}
    </div>
  );
}
```

### Progressive Enhancement

```tsx
function ProgressiveFeature() {
  const hasBasic = useFeatureFlag('basic-feature');
  const hasAdvanced = useFeatureFlag('advanced-feature');
  const hasPremium = useFeatureFlag('premium-feature');

  return (
    <div>
      {hasBasic && <BasicFeature />}
      {hasAdvanced && <AdvancedFeature />}
      {hasPremium && <PremiumFeature />}
    </div>
  );
}
```

### Flag-Driven Routing

```tsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isEnabled = useFeatureFlag('protected-feature');

  if (!isEnabled) {
    return <Navigate to="/unavailable" />;
  }

  return <>{children}</>;
}
```

### Dynamic Imports

```tsx
function DynamicFeature() {
  const useNewVersion = useFeatureFlag('new-version');

  const Component = useMemo(
    () =>
      lazy(() =>
        useNewVersion
          ? import('./NewVersion')
          : import('./OldVersion')
      ),
    [useNewVersion]
  );

  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}
```

### Effect Dependencies

```tsx
function AnalyticsTracking() {
  const trackingEnabled = useFeatureFlag('analytics-tracking');

  useEffect(() => {
    if (!trackingEnabled) return;

    // Set up tracking
    const tracker = initializeTracker();

    return () => {
      tracker.cleanup();
    };
  }, [trackingEnabled]);

  return <Content />;
}
```

### Memoized Computations

```tsx
function ExpensiveFeature() {
  const isEnabled = useFeatureFlag('expensive-feature');

  const expensiveValue = useMemo(
    () => isEnabled ? computeExpensive() : null,
    [isEnabled]
  );

  if (!isEnabled) return null;

  return <Feature value={expensiveValue} />;
}
```

### Callback Optimization

```tsx
function CallbackFeature() {
  const isEnabled = useFeatureFlag('feature');

  const handleClick = useCallback(() => {
    if (!isEnabled) return;

    performAction();
  }, [isEnabled]);

  return <Button onClick={handleClick}>Action</Button>;
}
```

## Performance

### Avoiding Re-renders

```tsx
// Bad: Re-renders on every flag change
function BadExample() {
  const allFlags = useAllFlags();
  const myFlag = allFlags.find(f => f.key === 'my-flag');
  return <div>{myFlag?.enabled ? 'On' : 'Off'}</div>;
}

// Good: Only re-renders when specific flag changes
function GoodExample() {
  const isEnabled = useFeatureFlag('my-flag');
  return <div>{isEnabled ? 'On' : 'Off'}</div>;
}
```

### Memo Optimization

```tsx
import { memo } from 'react';

const FeatureComponent = memo(function FeatureComponent() {
  const isEnabled = useFeatureFlag('feature');

  if (!isEnabled) return null;

  return <ExpensiveComponent />;
});
```

### Conditional Subscription

```tsx
function ConditionalSubscription() {
  const isEnabled = useFeatureFlag('realtime-updates');

  useEffect(() => {
    if (!isEnabled) return;

    const subscription = subscribeToUpdates();
    return () => subscription.unsubscribe();
  }, [isEnabled]);

  return <Content />;
}
```

### Debounced Flags

```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function DebouncedFeature() {
  const rawValue = useFeatureFlag('frequently-changing');
  const debouncedValue = useDebouncedValue(rawValue, 1000);

  return <Feature enabled={debouncedValue} />;
}
```

## Testing

### Basic Hook Testing

```tsx
import { renderHook } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';
import { useFeatureFlag } from '@/lib/flags';

describe('useFeatureFlag', () => {
  it('returns flag value', () => {
    const wrapper = ({ children }) => (
      <FeatureFlagProvider
        flags={[{ key: 'test-flag', enabled: true, defaultValue: true }]}
      >
        {children}
      </FeatureFlagProvider>
    );

    const { result } = renderHook(
      () => useFeatureFlag('test-flag'),
      { wrapper }
    );

    expect(result.current).toBe(true);
  });
});
```

### Testing Flag Changes

```tsx
import { act, renderHook } from '@testing-library/react';

it('updates when flag changes', () => {
  const { result, rerender } = renderHook(
    ({ flagValue }) => (
      <FeatureFlagProvider
        flags={[{ key: 'test', enabled: true, defaultValue: flagValue }]}
      >
        <TestComponent />
      </FeatureFlagProvider>
    ),
    { initialProps: { flagValue: false } }
  );

  expect(result.current).toBe(false);

  rerender({ flagValue: true });

  expect(result.current).toBe(true);
});
```

### Mock Hooks

```tsx
// test-utils.ts
import { vi } from 'vitest';

export function mockFeatureFlag(flagKey: string, value: boolean) {
  vi.mock('@/lib/flags', () => ({
    useFeatureFlag: (key: string) => key === flagKey ? value : false
  }));
}

// Usage
mockFeatureFlag('my-flag', true);
```

### Custom Test Wrapper

```tsx
import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

export function renderWithFlags(
  ui: ReactElement,
  flags: Record<string, boolean> = {}
) {
  const flagArray = Object.entries(flags).map(([key, value]) => ({
    key,
    enabled: true,
    defaultValue: value
  }));

  return render(
    <FeatureFlagProvider flags={flagArray}>
      {ui}
    </FeatureFlagProvider>
  );
}

// Usage
renderWithFlags(<MyComponent />, {
  'feature-a': true,
  'feature-b': false
});
```

## Debug Utilities

### Debug Flag Values

```tsx
function DebugFlags() {
  const flags = useAllFlags();

  useEffect(() => {
    console.group('Feature Flags');
    flags.forEach(flag => {
      console.log(`${flag.key}:`, flag.enabled);
    });
    console.groupEnd();
  }, [flags]);

  return null;
}
```

### Flag Change Logger

```tsx
function FlagChangeLogger() {
  const flags = useAllFlags();

  useEffect(() => {
    const unsubscribe = flags.forEach(flag => {
      return subscribeToFlagChanges(flag.key, (change) => {
        console.log('Flag changed:', change);
      });
    });

    return () => unsubscribe.forEach(fn => fn());
  }, [flags]);

  return null;
}
```

## Best Practices

### 1. Use Specific Hooks

```tsx
// Good: Specific hook for specific use case
const isEnabled = useFeatureFlag('my-flag');

// Bad: Fetching all flags for one value
const allFlags = useAllFlags();
const isEnabled = allFlags.find(f => f.key === 'my-flag')?.enabled;
```

### 2. Consistent Naming

```tsx
// Good: Clear, consistent naming
const isNewDashboardEnabled = useFeatureFlag('new-dashboard');
const showBetaFeatures = useFeatureFlag('beta-features');

// Bad: Inconsistent naming
const flag1 = useFeatureFlag('new-dashboard');
const x = useFeatureFlag('beta-features');
```

### 3. Default Values

```tsx
// Good: Explicit default
const isEnabled = useFeatureFlag('optional-feature', {
  defaultValue: false
});

// Bad: Implicit undefined handling
const isEnabled = useFeatureFlag('optional-feature');
if (isEnabled === undefined) {
  // Handle undefined
}
```

### 4. Extract Flag Logic

```tsx
// Good: Custom hook for complex logic
function useCanAccessPremium() {
  const hasPremiumFlag = useFeatureFlag('premium-access');
  const user = useCurrentUser();

  return hasPremiumFlag && user.subscription === 'premium';
}

// Usage
const canAccess = useCanAccessPremium();
```

## See Also

- [COMPONENTS.md](./COMPONENTS.md) - Flag components
- [PROVIDER.md](./PROVIDER.md) - Provider configuration
- [README.md](./README.md) - Feature flags overview
