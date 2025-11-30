# Dynamic Configuration

Runtime configuration updates, feature flag integration, and A/B testing configuration system.

**Location**: `/home/user/enzyme/src/config/dynamic-config.ts`

## Table of Contents

- [Overview](#overview)
- [DynamicConfigManager](#dynamicconfigmanager)
- [Feature Flag Evaluation](#feature-flag-evaluation)
- [A/B Testing](#ab-testing)
- [Configuration Hot-Reload](#configuration-hot-reload)
- [Remote Synchronization](#remote-synchronization)
- [Usage Patterns](#usage-patterns)

## Overview

The dynamic configuration system provides:

- **Runtime Updates**: Update configuration without redeploying
- **Feature Flags**: Evaluate feature flags with context
- **A/B Testing**: Assign and manage test variants
- **Hot Reload**: Automatically sync configuration changes
- **Offline Support**: Cache configuration for offline use
- **WebSocket Updates**: Real-time configuration updates

## DynamicConfigManager

Main class for managing dynamic configuration.

### Initialization

```typescript
import { getDynamicConfig, initializeDynamicConfig } from '@/config';

// Get singleton instance
const dynamicConfig = getDynamicConfig({
  pollingInterval: 60000,      // Poll every minute
  enableWebSocket: true,        // Enable WebSocket updates
  cacheDuration: 300000,        // Cache for 5 minutes
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000
  }
});

// Initialize
await initializeDynamicConfig();
```

### Configuration Options

```typescript
interface DynamicConfigOptions {
  /** Polling interval in milliseconds */
  pollingInterval?: number;

  /** Enable WebSocket for real-time updates */
  enableWebSocket?: boolean;

  /** Cache duration in milliseconds */
  cacheDuration?: number;

  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };

  /** Fallback strategy */
  fallback?: 'cache' | 'default' | 'throw';
}
```

### State Management

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();

// Get current state
const state = config.getState();
console.log({
  initialized: state.initialized,
  syncing: state.syncing,
  lastSyncedAt: state.lastSyncedAt,
  connectionStatus: state.connectionStatus
});

// Subscribe to state changes
const unsubscribe = config.subscribeToState((newState) => {
  console.log('State changed:', newState);
});

// Cleanup
unsubscribe();
```

## Feature Flag Evaluation

### Register Flags

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();

// Register a feature flag
config.registerFlag({
  key: 'new-dashboard',
  defaultValue: false,
  name: 'New Dashboard',
  description: 'Redesigned dashboard with improved UX',
  environments: ['staging', 'production'],
  rolloutPercentage: 25,
  expiresAt: '2024-12-31T23:59:59Z'
});
```

### Evaluate Flags

```typescript
import { getDynamicConfig, evaluateFeatureFlag } from '@/config';

const config = getDynamicConfig();

// Evaluate with context
const result = config.evaluateFlag('new-dashboard', {
  userId: 'user-123',
  environment: 'production',
  userRole: 'admin',
  customAttributes: {
    subscription: 'premium',
    region: 'us-west'
  }
});

console.log({
  enabled: result.value,
  reason: result.reason,  // 'DEFAULT' | 'ROLLOUT' | 'OVERRIDE' | 'EXPIRED'
  variant: result.variant
});

// Simple boolean check
const isEnabled = config.isFlagEnabled('new-dashboard', {
  userId: 'user-123'
});

// Convenience function
const enabled = evaluateFeatureFlag('new-dashboard', {
  userId: 'user-123'
});
```

### Flag Configuration

```typescript
interface FeatureFlagConfig {
  /** Unique flag key */
  key: string;

  /** Default value */
  defaultValue: boolean;

  /** Display name */
  name?: string;

  /** Description */
  description?: string;

  /** Target environments */
  environments?: ConfigEnvironment[];

  /** Minimum required role */
  minRole?: string;

  /** Rollout percentage (0-100) */
  rolloutPercentage?: number;

  /** Expiration date */
  expiresAt?: string;

  /** Variant identifier */
  variant?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
```

### Evaluation Context

```typescript
interface FeatureFlagContext {
  /** Current environment */
  environment: ConfigEnvironment;

  /** User ID for consistent bucketing */
  userId?: string;

  /** Session ID fallback */
  sessionId?: string;

  /** User role for targeting */
  userRole?: string;

  /** Custom attributes for rules */
  customAttributes?: Record<string, JsonValue>;
}
```

### Evaluation Reasons

```typescript
type FeatureFlagReason =
  | 'DEFAULT'    // Using default value
  | 'ROLLOUT'    // Percentage rollout
  | 'OVERRIDE'   // Developer override
  | 'EXPIRED'    // Flag expired
  | 'TARGETING'; // Targeted by rules
```

## A/B Testing

### Register Tests

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();

config.registerTest({
  id: 'checkout-experiment',
  name: 'Checkout Flow Optimization',
  status: 'running',
  variants: [
    {
      id: 'control',
      name: 'Original',
      isControl: true,
      config: { steps: 3 }
    },
    {
      id: 'variant-a',
      name: 'Optimized',
      config: { steps: 2 }
    },
    {
      id: 'variant-b',
      name: 'Express',
      config: { steps: 1 }
    }
  ],
  allocation: {
    'control': 33,
    'variant-a': 33,
    'variant-b': 34
  }
});
```

### Get Variant Assignment

```typescript
import { getDynamicConfig, getABTestVariant } from '@/config';

const config = getDynamicConfig();

// Get assigned variant for user
const variant = config.getVariant('checkout-experiment', 'user-123');

console.log({
  id: variant?.id,
  name: variant?.name,
  config: variant?.config
});

// Get variant configuration
const variantConfig = config.getVariantConfig('checkout-experiment', 'user-123');

// Convenience function
const assigned = getABTestVariant('checkout-experiment', 'user-123');
```

### Test Configuration

```typescript
interface ABTestConfig {
  /** Unique test ID */
  id: string;

  /** Display name */
  name: string;

  /** Test status */
  status: 'draft' | 'running' | 'paused' | 'completed';

  /** Test variants */
  variants: ABTestVariant[];

  /** Traffic allocation percentage */
  allocation: Record<string, number>;

  /** Start date */
  startDate?: string;

  /** End date */
  endDate?: string;

  /** Target environments */
  environments?: ConfigEnvironment[];
}

interface ABTestVariant {
  /** Variant ID */
  id: string;

  /** Display name */
  name: string;

  /** Is control group */
  isControl?: boolean;

  /** Variant configuration */
  config?: ConfigRecord;
}
```

## Configuration Hot-Reload

### Force Refresh

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();

// Force immediate refresh from remote
await config.forceRefresh();
```

### Subscribe to Changes

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();

// Subscribe to configuration changes
const unsubscribe = config.subscribeToConfig(
  'features',
  'newFeature',
  (event) => {
    console.log('Config changed:', {
      namespace: event.namespace,
      key: event.key,
      oldValue: event.oldValue,
      newValue: event.newValue,
      source: event.source
    });
  }
);

// Cleanup
unsubscribe();
```

### Runtime Configuration

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();

// Set runtime configuration
config.setRuntimeConfig('ui', 'theme', 'dark');

// Get runtime configuration
const theme = config.getRuntimeConfig<string>('ui', 'theme');
```

## Remote Synchronization

### Polling Updates

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig({
  pollingInterval: 60000, // Poll every minute
});

await config.initialize();

// Manually trigger sync
await config.syncWithRemote();

// Stop polling
config.stopPolling();
```

### WebSocket Updates

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig({
  enableWebSocket: true
});

await config.initialize();

// WebSocket automatically connects and receives updates
// Connection status available in state
const state = config.getState();
console.log(state.connectionStatus); // 'connected' | 'disconnected' | 'connecting' | 'error'
```

### Caching Strategy

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig({
  cacheDuration: 300000,      // Cache for 5 minutes
  fallback: 'cache'            // Use cache on error
});

// Configuration is automatically cached to localStorage
// and loaded on initialization
```

### Remote Sources

The system supports multiple remote sources:

```typescript
// Remote API
VITE_FEATURE_FLAGS_SOURCE=remote
VITE_FEATURE_FLAGS_URL=https://config.example.com/flags

// LaunchDarkly
VITE_FEATURE_FLAGS_SOURCE=launchdarkly
VITE_FEATURE_FLAGS_URL=https://app.launchdarkly.com

// Local (default)
VITE_FEATURE_FLAGS_SOURCE=local
```

## Usage Patterns

### React Integration

```tsx
import { useEffect, useState } from 'react';
import { getDynamicConfig } from '@/config';

function DynamicConfigProvider({ children }) {
  const [config] = useState(() => getDynamicConfig());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await config.initialize();
      setReady(true);
    }
    init();

    return () => config.shutdown();
  }, [config]);

  if (!ready) {
    return <Loading />;
  }

  return <>{children}</>;
}
```

### Feature Flag Hook

```tsx
import { useEffect, useState } from 'react';
import { getDynamicConfig } from '@/config';

function useRuntimeFlag(flagKey: string) {
  const [enabled, setEnabled] = useState(false);
  const config = getDynamicConfig();

  useEffect(() => {
    // Initial value
    setEnabled(config.isFlagEnabled(flagKey));

    // Subscribe to changes
    const unsubscribe = config.subscribeToConfig(
      'features',
      flagKey,
      (event) => {
        setEnabled(Boolean(event.newValue));
      }
    );

    return unsubscribe;
  }, [flagKey, config]);

  return enabled;
}
```

### A/B Test Hook

```tsx
import { useEffect, useState } from 'react';
import { getDynamicConfig } from '@/config';
import { useCurrentUser } from '@/hooks';

function useABTestVariant(testId: string) {
  const user = useCurrentUser();
  const [variant, setVariant] = useState(null);
  const config = getDynamicConfig();

  useEffect(() => {
    const assigned = config.getVariant(testId, user?.id);
    setVariant(assigned);
  }, [testId, user?.id, config]);

  return variant;
}

// Usage
function CheckoutFlow() {
  const variant = useABTestVariant('checkout-experiment');

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

### Flag Overrides

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();

// Set override (for testing/debugging)
config.setOverride('my-feature', true);

// Check override
const override = config.getOverride('my-feature');

// Remove override
config.removeOverride('my-feature');

// Get all overrides
const allOverrides = config.getOverrides();

// Clear all overrides
config.clearOverrides();
```

## Testing

### Mock Dynamic Config

```typescript
import { vi } from 'vitest';

vi.mock('@/config', () => ({
  getDynamicConfig: () => ({
    evaluateFlag: vi.fn().mockReturnValue({
      value: true,
      reason: 'DEFAULT'
    }),
    isFlagEnabled: vi.fn().mockReturnValue(true),
    getVariant: vi.fn().mockReturnValue({
      id: 'variant-a',
      config: {}
    })
  })
}));
```

### Test Configuration States

```typescript
import { getDynamicConfig } from '@/config';

describe('DynamicConfig', () => {
  it('initializes correctly', async () => {
    const config = getDynamicConfig();
    await config.initialize();

    const state = config.getState();
    expect(state.initialized).toBe(true);
  });

  it('evaluates flags with context', () => {
    const config = getDynamicConfig();

    const result = config.evaluateFlag('test-flag', {
      userId: 'test-user',
      environment: 'test'
    });

    expect(result.value).toBeDefined();
  });
});
```

## Best Practices

### 1. Initialize Early

```typescript
// main.tsx
import { initializeDynamicConfig } from '@/config';

await initializeDynamicConfig();

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

### 2. Use Consistent Context

```typescript
const context = {
  userId: currentUser.id,
  environment: env.appEnv,
  userRole: currentUser.role
};

// Use same context for all evaluations
const flagA = config.evaluateFlag('flag-a', context);
const flagB = config.evaluateFlag('flag-b', context);
```

### 3. Handle Loading States

```tsx
function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const config = getDynamicConfig();
      await config.initialize();
      setReady(true);
    }
    init();
  }, []);

  if (!ready) {
    return <Loading />;
  }

  return <AppContent />;
}
```

### 4. Cache Configuration

```typescript
// Use caching for better offline support
const config = getDynamicConfig({
  cacheDuration: 3600000,  // 1 hour
  fallback: 'cache'
});
```

### 5. Monitor Sync Errors

```typescript
const config = getDynamicConfig();

config.subscribeToState((state) => {
  if (state.lastError) {
    console.error('Config sync error:', state.lastError);
    // Report to monitoring service
  }
});
```

## Related Documentation

### Configuration System
- [README.md](./README.md) - Configuration overview
- [ENV.md](./ENV.md) - Environment configuration
- [REGISTRY.md](./REGISTRY.md) - Configuration registry
- [HOOKS.md](./HOOKS.md) - Configuration hooks
- [TYPES.md](./TYPES.md) - TypeScript types
- [PROVIDERS.md](./PROVIDERS.md) - Configuration providers

### State & Sync
- [State System](../state/README.md) - State management with dynamic updates
- [State Sync](../state/SYNC.md) - Multi-tab state synchronization
- [State Dynamic Patterns](../state/STORES.md) - Dynamic store patterns

### Features & API
- [Feature Flags](../flags/README.md) - Feature flag integration
- [API Client](../api/README.md) - API configuration sync
- [Realtime Sync](../integration/REALTIME_QUERIES_SERVICES.md) - Real-time configuration updates

### Authentication
- [Auth System](../auth/README.md) - Dynamic auth configuration
- [Auth Patterns](../auth/PATTERNS.md) - Auth config patterns
