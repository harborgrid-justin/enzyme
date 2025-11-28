# Feature Flags Module

> **Purpose:** Comprehensive feature flag system with targeting rules, A/B testing, gradual rollouts, and real-time updates.

## Overview

The Feature Flags module provides a production-ready feature flagging system that enables safe deployment of new features, A/B testing, gradual rollouts, and runtime configuration. It supports multiple backend providers, sophisticated targeting rules, variant testing, and comprehensive analytics.

This module goes beyond simple boolean flags by offering percentage-based rollouts, user segmentation, dependency management between flags, lifecycle tracking, and real-time updates via WebSocket. It seamlessly integrates with all other modules to provide flag-driven configuration across your entire application.

Perfect for teams practicing continuous delivery, this module allows you to decouple deployment from release, test features in production with specific user segments, and quickly roll back problematic changes without redeploying.

## Key Features

- Boolean, string, number, and JSON flag types
- Multiple provider backends (local, remote, cached, polling, WebSocket)
- Percentage-based gradual rollouts
- User segmentation and targeting rules
- Variant testing (A/B/n tests)
- Flag dependencies and prerequisites
- Lifecycle management (alpha, beta, GA, deprecated)
- Real-time flag updates
- Exposure tracking and analytics
- Impact analysis (correlation with metrics)
- Flag-driven module loading
- Integration with routing, API, UI, and performance modules
- Configurable features with dynamic toggles
- Debug mode with flag override panel
- Type-safe flag keys with autocomplete

## Quick Start

```tsx
import {
  FeatureFlagProvider,
  useFeatureFlag,
  FlagGate,
} from '@/lib/flags';

// 1. Wrap your app with provider
function App() {
  return (
    <FeatureFlagProvider>
      <YourApp />
    </FeatureFlagProvider>
  );
}

// 2. Use flags in components
function Dashboard() {
  const newDashboard = useFeatureFlag('new-dashboard');

  return newDashboard ? <NewDashboard /> : <OldDashboard />;
}

// 3. Use declarative gates
function Features() {
  return (
    <div>
      <FlagGate flagKey="beta-features">
        <BetaFeaturePanel />
      </FlagGate>

      <FlagGate flagKey="admin-tools" fallback={<div>Coming soon</div>}>
        <AdminTools />
      </FlagGate>
    </div>
  );
}
```

## Exports

### Components
- `FeatureFlagProvider` - Context provider for flag system
- `FlagGate` - Conditional rendering based on single flag
- `FlagGateAll` - Render only if all flags are enabled
- `FlagGateAny` - Render if any flag is enabled
- `FlagConfigurable` - Render prop component for flag-based config

### Hooks
- `useFeatureFlag` - Check if flag is enabled
- `useFeatureFlags` - Get multiple flags at once
- `useFeatureFlagsStatus` - Get loading/error state
- `useFeatureFlaggedModule` - Load modules conditionally based on flags

### HOCs
- `withFeatureFlag` - HOC to wrap component with flag check
- `withoutFeatureFlag` - HOC to hide component if flag is enabled

### Flag Engine
- `FlagEngine` - Advanced evaluation engine with targeting
- `createFlagEngine()` - Factory for engine instances

### Providers
- `LocalProvider` - In-memory flag storage
- `RemoteProvider` - Fetch flags from API
- `CachedProvider` - Cache remote flags locally
- `PollingProvider` - Poll for flag updates
- `WebSocketProvider` - Real-time flag updates
- `CompositeProvider` - Chain multiple providers

### Targeting & Rollouts
- `TargetingRuleEngine` - Evaluate targeting rules
- `PercentageRollout` - Gradual rollout manager
- `UserSegmenter` - User segmentation logic
- `FlagVariants` - A/B/n test variants

### Analytics
- `FlagExposureTracker` - Track flag exposures
- `FlagImpactAnalyzer` - Analyze flag impact on metrics
- `FlagAnalytics` - Complete analytics suite

### Integration
- `apiFlags` - API-specific feature flags
- `routingFlags` - Routing-specific flags
- `uiFlags` - UI component flags
- `performanceFlags` - Performance optimization flags
- `FlagAnalyticsBridge` - Connect to analytics systems
- `FlagDrivenLoading` - Code splitting with flags

### Utilities
- `flagKeys` - Type-safe flag key registry
- `flagCategories` - Organize flags by category
- `isDebugModeEnabled()` - Check debug mode status
- `isFlagEnabled()` - Imperative flag check (outside React)

### Types
- `FlagKey` - Type-safe flag key literal
- `FlagValue` - Flag value (boolean | string | number | object)
- `FlagConfig` - Flag configuration object
- `TargetingRule` - Rule for user targeting
- `FlagVariant` - Variant definition for A/B tests
- `RolloutStrategy` - Rollout configuration
- `FlagAnalytics` - Analytics data structure

## Architecture

The flags module uses a provider chain architecture:

```
┌──────────────────────────────────────┐
│     React Components & Hooks          │
│   (useFeatureFlag, FlagGate)         │
└─────────────────┬────────────────────┘
                  │
┌─────────────────┴────────────────────┐
│          Flag Engine                  │
│  (Evaluation, Targeting, Variants)   │
└─────────────────┬────────────────────┘
                  │
┌─────────────────┴────────────────────┐
│        Provider Chain                 │
│  WebSocket → Remote → Cached → Local │
└──────────────────────────────────────┘
```

### Integration Points

- **Routing**: Flag-gated routes and feature-specific routing
- **API**: Flag-controlled API endpoints and versions
- **UI**: Conditional component rendering
- **Performance**: Flag-driven optimization strategies
- **Analytics**: Exposure tracking and impact analysis

## Common Patterns

### Pattern 1: Basic Feature Toggle
```tsx
import { useFeatureFlag, FlagGate } from '@/lib/flags';

// Hook approach
function Header() {
  const showNewNav = useFeatureFlag('new-navigation');

  return (
    <header>
      {showNewNav ? <NewNavigation /> : <OldNavigation />}
    </header>
  );
}

// Declarative approach
function Sidebar() {
  return (
    <aside>
      <FlagGate flagKey="new-sidebar">
        <NewSidebar />
      </FlagGate>
    </aside>
  );
}
```

### Pattern 2: Gradual Rollout with Percentage
```tsx
import { FeatureFlagProvider, createProviderChain } from '@/lib/flags';

// Configure gradual rollout
const provider = createProviderChain({
  remote: {
    endpoint: '/api/flags',
  },
  local: {
    flags: {
      'new-checkout': {
        enabled: true,
        rollout: {
          percentage: 25, // 25% of users
          strategy: 'sticky', // Same users always see it
        },
      },
    },
  },
});

function App() {
  return (
    <FeatureFlagProvider provider={provider}>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### Pattern 3: User Targeting
```tsx
import { FlagEngine } from '@/lib/flags';

const engine = new FlagEngine({
  flags: {
    'beta-features': {
      enabled: true,
      targeting: {
        rules: [
          {
            attribute: 'email',
            operator: 'endsWith',
            value: '@company.com',
          },
          {
            attribute: 'plan',
            operator: 'in',
            value: ['pro', 'enterprise'],
          },
        ],
        operator: 'and', // Both rules must match
      },
    },
  },
});

// Check flag with user context
const canSeeBeta = engine.evaluate('beta-features', {
  user: {
    email: 'john@company.com',
    plan: 'enterprise',
  },
});
```

### Pattern 4: A/B Testing with Variants
```tsx
import { useFeatureFlag } from '@/lib/flags';

function PricingPage() {
  const pricingVariant = useFeatureFlag('pricing-test');

  // pricingVariant can be 'control', 'variant-a', 'variant-b', etc.
  switch (pricingVariant) {
    case 'variant-a':
      return <PricingTableA />;
    case 'variant-b':
      return <PricingTableB />;
    default:
      return <PricingTableControl />;
  }
}

// Configure variants in provider
const flags = {
  'pricing-test': {
    enabled: true,
    variants: [
      { key: 'control', weight: 34 },
      { key: 'variant-a', weight: 33 },
      { key: 'variant-b', weight: 33 },
    ],
  },
};
```

### Pattern 5: Flag-Driven Code Splitting
```tsx
import { FlagConfigurable, useFeatureFlaggedModule } from '@/lib/flags';

// Lazy load modules based on flags
function ChartWidget() {
  const { module: ChartComponent, isLoading } = useFeatureFlaggedModule({
    flagKey: 'new-charts',
    enabledModule: () => import('./NewChart'),
    fallbackModule: () => import('./OldChart'),
  });

  if (isLoading) return <Spinner />;

  return <ChartComponent data={data} />;
}

// Or use render prop
function Dashboard() {
  return (
    <FlagConfigurable flagKey="advanced-analytics">
      {({ isEnabled, isLoading }) => {
        if (isLoading) return <Spinner />;

        return isEnabled
          ? <AdvancedAnalytics />
          : <BasicAnalytics />;
      }}
    </FlagConfigurable>
  );
}
```

### Pattern 6: Real-Time Flag Updates
```tsx
import { WebSocketProvider, FeatureFlagProvider } from '@/lib/flags';

const wsProvider = new WebSocketProvider({
  url: 'wss://flags.example.com',
  reconnect: true,
  onFlagChange: (flag, value) => {
    console.log(`Flag ${flag} changed to ${value}`);
  },
});

function App() {
  return (
    <FeatureFlagProvider provider={wsProvider}>
      <YourApp />
    </FeatureFlagProvider>
  );
}

// Flags update in real-time without page refresh
```

## Configuration

### Provider Configuration
```tsx
import {
  FeatureFlagProvider,
  createRemoteProvider,
  createCachedProvider,
} from '@/lib/flags';

// Remote provider with caching
const provider = createCachedProvider({
  remote: createRemoteProvider({
    endpoint: '/api/flags',
    headers: {
      'Authorization': 'Bearer token',
    },
    refreshInterval: 60000, // Refresh every minute
  }),
  cache: {
    ttl: 300000, // Cache for 5 minutes
    storage: localStorage,
  },
});

<FeatureFlagProvider
  provider={provider}
  fallbackFlags={{
    'new-feature': false, // Default if remote fails
  }}
>
  <App />
</FeatureFlagProvider>
```

### Flag Definitions
```tsx
const flags = {
  // Boolean flag
  'dark-mode': true,

  // String variant
  'homepage-layout': 'v2',

  // Number value
  'max-results': 50,

  // With rollout
  'new-search': {
    enabled: true,
    rollout: {
      percentage: 50,
      strategy: 'sticky',
    },
  },

  // With targeting
  'admin-panel': {
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

  // With variants (A/B test)
  'cta-button': {
    enabled: true,
    variants: [
      { key: 'blue', weight: 50 },
      { key: 'green', weight: 50 },
    ],
  },
};
```

## Testing

### Testing with Mock Flags
```tsx
import { render, screen } from '@testing-library/react';
import { FeatureFlagProvider } from '@/lib/flags';

function renderWithFlags(ui, flags = {}) {
  return render(
    <FeatureFlagProvider
      provider={{
        getFlags: async () => flags,
      }}
    >
      {ui}
    </FeatureFlagProvider>
  );
}

describe('Dashboard', () => {
  it('shows new feature when flag is enabled', () => {
    renderWithFlags(<Dashboard />, {
      'new-feature': true,
    });

    expect(screen.getByText('New Feature')).toBeInTheDocument();
  });

  it('hides new feature when flag is disabled', () => {
    renderWithFlags(<Dashboard />, {
      'new-feature': false,
    });

    expect(screen.queryByText('New Feature')).not.toBeInTheDocument();
  });
});
```

## Performance Considerations

1. **Evaluation Caching**: Flag evaluations are cached per render
2. **Bundle Size**: Core ~8KB, providers ~3KB each, analytics ~5KB gzipped
3. **Network**: Cached provider reduces API calls by 90%
4. **Memory**: Flags stored in memory, typically <1KB per 100 flags
5. **Real-time**: WebSocket overhead ~2KB connection
6. **Code Splitting**: Flag-driven imports reduce initial bundle

## Troubleshooting

### Issue: Flag Value Not Updating
**Solution:** Ensure provider supports updates (WebSocket or Polling):
```tsx
const provider = new PollingProvider({
  endpoint: '/api/flags',
  interval: 30000, // Poll every 30 seconds
});
```

### Issue: Flag Evaluation Slow
**Solution:** Use cached provider to reduce network calls:
```tsx
const provider = createCachedProvider({
  remote: remoteProvider,
  cache: { ttl: 300000 },
});
```

### Issue: Inconsistent Rollout Results
**Solution:** Ensure sticky strategy with consistent user ID:
```tsx
<FeatureFlagProvider
  user={{ id: currentUser.id }} // Consistent user ID
  provider={provider}
/>
```

### Issue: Flag Not Found Error
**Solution:** Provide fallback values:
```tsx
const isEnabled = useFeatureFlag('my-flag', { fallback: false });
```

## See Also

- [Feature Flag Configuration](/reuse/templates/react/src/lib/flags/flagKeys.ts)
- [Flag Providers](./providers/README.md)
- [Flag Analytics](./analytics/README.md)
- [Advanced Features](./advanced/README.md)
- [Routing Integration](./integration/routing-flags.ts)
- [API Integration](./integration/api-flags.ts)

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
