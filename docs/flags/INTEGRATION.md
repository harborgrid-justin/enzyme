# Feature Flag Integrations

Documentation for feature flag integration patterns including library integration, domain-specific flags, and analytics bridging.

**Base Location**: `/home/user/enzyme/src/lib/flags/integration/`

## Table of Contents

- [FlagConfigurable](#flagconfigurable)
- [Flag Analytics Bridge](#flag-analytics-bridge)
- [Configurable Features](#configurable-features)
- [Flag-Driven Loading](#flag-driven-loading)
- [Library Integration](#library-integration)
- [Domain Flags](#domain-flags)

## FlagConfigurable

Universal wrapper component for flag-controlled features.

**Location**: `/home/user/enzyme/src/lib/flags/integration/FlagConfigurable.tsx`

### Basic Usage

```tsx
import { FlagConfigurable } from '@/lib/flags/integration';

function App() {
  return (
    <FlagConfigurable flagKey="new-feature">
      <NewFeature />
    </FlagConfigurable>
  );
}
```

### Props

```typescript
interface FlagConfigurableProps {
  /** Flag key to evaluate */
  flagKey: string;

  /** Children to render when enabled */
  children: React.ReactNode;

  /** Fallback content */
  fallback?: React.ReactNode;

  /** Track exposure automatically */
  trackExposure?: boolean;

  /** Additional metadata */
  metadata?: FlagMetadata;

  /** Render callback */
  render?: (props: FlagRenderProps) => React.ReactNode;
}
```

### With Metadata

```tsx
<FlagConfigurable
  flagKey="premium-feature"
  metadata={{
    category: 'premium',
    owner: 'product-team',
    trackingId: 'feat-001'
  }}
>
  <PremiumContent />
</FlagConfigurable>
```

### Render Props Pattern

```tsx
<FlagConfigurable
  flagKey="theme-toggle"
  render={({ enabled, metadata }) => (
    <div className={enabled ? 'dark' : 'light'}>
      <Content />
      {metadata && <FeatureInfo metadata={metadata} />}
    </div>
  )}
/>
```

### A/B Testing Component

```tsx
import { FlagConfigurableAB } from '@/lib/flags/integration';

<FlagConfigurableAB
  testId="checkout-experiment"
  variants={{
    control: <OriginalCheckout />,
    'variant-a': <OptimizedCheckout />,
    'variant-b': <ExpressCheckout />
  }}
/>
```

### Multi-Flag Component

```tsx
import { FlagConfigurableMulti } from '@/lib/flags/integration';

<FlagConfigurableMulti
  flags={['feature-a', 'feature-b', 'feature-c']}
  requireAll={true}
>
  <RequiresAllFeatures />
</FlagConfigurableMulti>
```

### Gated Component

```tsx
import { FlagConfigurableGated } from '@/lib/flags/integration';

<FlagConfigurableGated
  flagKey="beta-access"
  gate={{
    type: 'subscription',
    required: 'premium'
  }}
  fallback={<UpgradePrompt />}
>
  <BetaFeature />
</FlagConfigurableGated>
```

### HOC Pattern

```tsx
import { withFlagConfigurable } from '@/lib/flags/integration';

const EnhancedComponent = withFlagConfigurable({
  flagKey: 'enhanced-feature',
  trackExposure: true
})(MyComponent);
```

## Flag Analytics Bridge

Connects feature flags with analytics systems for exposure tracking and impact analysis.

**Location**: `/home/user/enzyme/src/lib/flags/integration/flag-analytics-bridge.ts`

### Setup

```tsx
import {
  FlagAnalyticsProvider,
  createAnalyticsBridge
} from '@/lib/flags/integration';

const analyticsBridge = createAnalyticsBridge({
  destinations: [
    {
      name: 'segment',
      track: (event) => {
        analytics.track(event.eventName, event.properties);
      }
    }
  ],
  sampleRate: 1.0,
  enableImpactTracking: true
});

function App() {
  return (
    <FlagAnalyticsProvider bridge={analyticsBridge}>
      <YourApp />
    </FlagAnalyticsProvider>
  );
}
```

### Hook Usage

```tsx
import { useFlagAnalytics } from '@/lib/flags/integration';

function TrackedFeature() {
  const { trackExposure, trackEvaluation, trackImpact } = useFlagAnalytics();

  useEffect(() => {
    trackExposure('my-feature');
  }, []);

  const handleClick = () => {
    trackImpact('my-feature', 'conversion', {
      value: 100,
      currency: 'USD'
    });
  };

  return <button onClick={handleClick}>Convert</button>;
}
```

### Exposure Tracking

```tsx
import { useTrackedFeatureFlag } from '@/lib/flags/integration';

function AutoTrackedFeature() {
  // Automatically tracks exposure
  const isEnabled = useTrackedFeatureFlag('auto-tracked');

  return isEnabled ? <Feature /> : null;
}
```

### Event Types

```typescript
interface FlagExposureEvent {
  flagKey: string;
  enabled: boolean;
  variant?: string;
  userId?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

interface FlagEvaluationEvent {
  flagKey: string;
  result: boolean;
  reason: string;
  duration: number;
  context?: EvaluationContext;
}

interface FeatureImpactMetric {
  flagKey: string;
  metricName: string;
  value: number;
  dimensions?: Record<string, unknown>;
}
```

### Custom Destinations

```tsx
import { createHttpDestination } from '@/lib/flags/integration';

const customDestination = createHttpDestination({
  endpoint: 'https://analytics.example.com/events',
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  },
  batchSize: 10,
  flushInterval: 5000
});

const bridge = createAnalyticsBridge({
  destinations: [customDestination]
});
```

### Impact Analysis

```tsx
import { useFlagImpactAnalysis } from '@/lib/flags/integration';

function ImpactDashboard() {
  const analysis = useFlagImpactAnalysis('checkout-optimization');

  return (
    <div>
      <h3>Impact Analysis</h3>
      <div>Conversion Rate: {analysis.metrics.conversionRate}%</div>
      <div>Revenue Impact: ${analysis.metrics.revenueImpact}</div>
      <div>Confidence: {analysis.confidence}</div>
    </div>
  );
}
```

## Configurable Features

System for defining and managing feature configurations.

**Location**: `/home/user/enzyme/src/lib/flags/integration/configurable-features.ts`

### Define Features

```tsx
import { defineFeature, registerFeatures } from '@/lib/flags/integration';

const checkoutFeature = defineFeature({
  key: 'checkout-v2',
  name: 'Checkout V2',
  category: 'commerce',
  stage: 'beta',
  dependencies: {
    required: ['payment-gateway'],
    any: ['stripe', 'paypal']
  },
  config: {
    steps: 2,
    showProgressBar: true,
    enableGuestCheckout: true
  }
});

registerFeatures([checkoutFeature]);
```

### Use Configurable Features

```tsx
import {
  ConfigurableFeaturesProvider,
  useConfigurableFeature
} from '@/lib/flags/integration';

function App() {
  return (
    <ConfigurableFeaturesProvider>
      <CheckoutFlow />
    </ConfigurableFeaturesProvider>
  );
}

function CheckoutFlow() {
  const feature = useConfigurableFeature('checkout-v2');

  if (!feature.enabled) {
    return <LegacyCheckout />;
  }

  return (
    <Checkout
      steps={feature.config.steps}
      showProgress={feature.config.showProgressBar}
    />
  );
}
```

### Feature Registry

```tsx
import { featureRegistry } from '@/lib/flags/integration';

// Get all features
const allFeatures = featureRegistry.getAll();

// Get by category
const commerceFeatures = featureRegistry.getByCategory('commerce');

// Get by stage
const betaFeatures = featureRegistry.getByStage('beta');

// Export for documentation
const featureExport = featureRegistry.export();
```

### Feature Hooks

```tsx
import {
  useFeaturesByCategory,
  useFeatureStats
} from '@/lib/flags/integration';

function FeatureDashboard() {
  const experimentalFeatures = useFeaturesByCategory('experimental');
  const stats = useFeatureStats();

  return (
    <div>
      <h3>Experimental Features</h3>
      {experimentalFeatures.map(feature => (
        <FeatureCard key={feature.key} feature={feature} />
      ))}

      <div>
        Total Features: {stats.total}
        Enabled: {stats.enabled}
        Beta: {stats.byStage.beta}
      </div>
    </div>
  );
}
```

## Flag-Driven Loading

Dynamic module loading based on feature flags.

**Location**: `/home/user/enzyme/src/lib/flags/integration/flag-driven-loading.ts`

### Code Splitting by Flag

```tsx
import { useFeatureFlaggedModule } from '@/lib/flags/integration';

function DynamicFeature() {
  const Module = useFeatureFlaggedModule('advanced-editor', {
    enabled: () => import('./AdvancedEditor'),
    disabled: () => import('./BasicEditor')
  });

  return (
    <Suspense fallback={<Loading />}>
      <Module />
    </Suspense>
  );
}
```

### Flagged Component

```tsx
import { createFlaggedComponent } from '@/lib/flags/integration';

const FlaggedDashboard = createFlaggedComponent({
  flagKey: 'new-dashboard',
  loader: () => import('./NewDashboard'),
  fallback: <OldDashboard />,
  loading: <Spinner />
});

function App() {
  return <FlaggedDashboard />;
}
```

### Lazy Loading Hook

```tsx
import { useFlaggedLazyComponent } from '@/lib/flags/integration';

function FeatureLoader() {
  const Component = useFlaggedLazyComponent('premium-feature', {
    component: () => import('./PremiumFeature'),
    fallback: <UpgradePrompt />
  });

  return <Component />;
}
```

### Module Preloading

```tsx
import { preloadModule } from '@/lib/flags/integration';

// Preload on hover
function FeatureLink() {
  const handleMouseEnter = () => {
    preloadModule('feature-name', () => import('./Feature'));
  };

  return (
    <Link to="/feature" onMouseEnter={handleMouseEnter}>
      Go to Feature
    </Link>
  );
}
```

### Route-Based Loading

```tsx
import { createFlaggedRouteLoaders } from '@/lib/flags/integration';

const routes = createFlaggedRouteLoaders({
  '/dashboard': {
    flagKey: 'new-dashboard',
    loader: () => import('./NewDashboard'),
    fallback: () => import('./OldDashboard')
  },
  '/analytics': {
    flagKey: 'analytics-v2',
    loader: () => import('./AnalyticsV2')
  }
});
```

## Library Integration

Connect feature flags to library modules.

**Location**: `/home/user/enzyme/src/lib/flags/integration/library-integration.ts`

### Setup

```tsx
import {
  LibraryIntegrationProvider,
  useLibraryFlags
} from '@/lib/flags/integration';

function App() {
  const getFlag = useFeatureFlag;

  return (
    <LibraryIntegrationProvider getFlag={getFlag}>
      <YourApp />
    </LibraryIntegrationProvider>
  );
}
```

### Use Library Flags

```tsx
function LibraryComponent() {
  const flags = useLibraryFlags('my-library');

  return (
    <Library
      enableFeatureA={flags.featureA}
      enableFeatureB={flags.featureB}
    />
  );
}
```

### Create Integration

```tsx
import { createLibraryIntegration } from '@/lib/flags/integration';

const myLibraryIntegration = createLibraryIntegration({
  id: 'my-library',
  name: 'My Library',
  version: '1.0.0',
  flags: {
    'feature-a': { defaultValue: false },
    'feature-b': { defaultValue: true }
  },
  transform: (flags) => ({
    enableFeatureA: flags['feature-a'],
    enableFeatureB: flags['feature-b']
  })
});
```

### Register Integration

```tsx
import { integrationRegistry } from '@/lib/flags/integration';

integrationRegistry.register(myLibraryIntegration);

// Get integration
const integration = integrationRegistry.get('my-library');
```

## Domain Flags

Pre-configured flag sets for specific domains.

### API Flags

```tsx
import { apiFlags, useApiFlag } from '@/lib/flags/integration';

function APIConfig() {
  const enableV2 = useApiFlag('api-v2');
  const enableCache = useApiFlag('api-cache');

  return (
    <APIClient
      version={enableV2 ? 'v2' : 'v1'}
      cacheEnabled={enableCache}
    />
  );
}

// Direct access
const isV2Enabled = apiFlags.isEnabled('api-v2');
const cacheConfig = apiFlags.getConfig('api-cache');
```

### UI Flags

```tsx
import { uiFlags, useUiFlag } from '@/lib/flags/integration';

function ThemeProvider() {
  const darkMode = useUiFlag('dark-mode');
  const animations = useUiFlag('animations');

  return (
    <Theme dark={darkMode} animate={animations}>
      <App />
    </Theme>
  );
}
```

### Routing Flags

```tsx
import { routingFlags, useRoutingFlag } from '@/lib/flags/integration';

function Router() {
  const enableV2Routes = useRoutingFlag('routing-v2');

  return enableV2Routes ? <RouterV2 /> : <RouterV1 />;
}
```

### Performance Flags

```tsx
import { performanceFlags, usePerformanceFlag } from '@/lib/flags/integration';

function PerformanceOptimizer() {
  const enableLazyLoad = usePerformanceFlag('lazy-loading');
  const enablePrefetch = usePerformanceFlag('prefetch');

  return (
    <Optimizer
      lazyLoad={enableLazyLoad}
      prefetch={enablePrefetch}
    />
  );
}
```

## Testing

### Testing with Analytics

```tsx
import { createAnalyticsBridge } from '@/lib/flags/integration';

describe('Analytics Integration', () => {
  it('tracks flag exposure', () => {
    const mockTrack = vi.fn();
    const bridge = createAnalyticsBridge({
      destinations: [{
        name: 'test',
        track: mockTrack
      }]
    });

    bridge.trackExposure('test-flag', true);

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        flagKey: 'test-flag',
        enabled: true
      })
    );
  });
});
```

### Testing Configurable Features

```tsx
import { defineFeature, featureRegistry } from '@/lib/flags/integration';

describe('Configurable Features', () => {
  beforeEach(() => {
    featureRegistry.clear();
  });

  it('registers features', () => {
    const feature = defineFeature({
      key: 'test-feature',
      name: 'Test',
      category: 'test'
    });

    featureRegistry.register(feature);

    expect(featureRegistry.get('test-feature')).toEqual(feature);
  });
});
```

## Best Practices

### 1. Centralize Flag Definitions

```tsx
// flags/definitions.ts
export const FEATURE_FLAGS = {
  NEW_DASHBOARD: defineFeature({
    key: 'new-dashboard',
    category: 'ui',
    stage: 'beta'
  }),
  API_V2: defineFeature({
    key: 'api-v2',
    category: 'api',
    stage: 'active'
  })
};
```

### 2. Track Important Flags

```tsx
<FlagConfigurable
  flagKey="critical-feature"
  trackExposure={true}
  metadata={{ priority: 'high' }}
>
  <CriticalFeature />
</FlagConfigurable>
```

### 3. Use Domain-Specific Flags

```tsx
// Instead of generic flags
const isEnabled = useFeatureFlag('enable-cache');

// Use domain-specific
const enableCache = useApiFlag('api-cache');
```

### 4. Implement Gradual Rollouts

```tsx
const checkoutFeature = defineFeature({
  key: 'checkout-v2',
  rollout: {
    percentage: 25,
    segments: ['beta-testers']
  }
});
```

## See Also

- [README.md](./README.md) - Feature flags overview
- [PROVIDER.md](./PROVIDER.md) - Provider setup
- [HOOKS.md](./HOOKS.md) - Feature flag hooks
- [COMPONENTS.md](./COMPONENTS.md) - Flag components
