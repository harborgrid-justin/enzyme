# A/B Testing with Feature Flags

Comprehensive guide to implementing A/B tests, multivariate tests, and experimentation with the feature flag system in @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Variant Configuration](#variant-configuration)
- [Implementation Patterns](#implementation-patterns)
- [Analytics Integration](#analytics-integration)
- [Statistical Analysis](#statistical-analysis)
- [Best Practices](#best-practices)
- [Advanced Techniques](#advanced-techniques)
- [Troubleshooting](#troubleshooting)

## Overview

A/B testing (split testing) allows you to compare two or more variants of a feature to determine which performs better. The feature flag system provides built-in support for variant testing, traffic allocation, and exposure tracking.

### Key Features

- **Multi-Variant Testing**: Support for A/B/n tests with unlimited variants
- **Traffic Allocation**: Percentage-based or weighted distribution
- **Sticky Assignment**: Consistent user experience across sessions
- **Exposure Tracking**: Automatic tracking of variant exposure
- **Conversion Tracking**: Built-in conversion event tracking
- **Statistical Analysis**: Integration with analytics platforms
- **Gradual Rollout**: Progressive rollout of winning variants

## Quick Start

### Define Variant Flag

```typescript
const flags = {
  'checkout-experiment': {
    enabled: true,
    variants: [
      { key: 'control', weight: 34 },      // 34% of users
      { key: 'variant-a', weight: 33 },    // 33% of users
      { key: 'variant-b', weight: 33 },    // 33% of users
    ],
    tracking: {
      experimentId: 'checkout-v2-test',
      goal: 'purchase-completion',
    },
  },
};
```

### Use Variant in Component

```tsx
import { useFeatureFlag } from '@/lib/flags';

function CheckoutPage() {
  const variant = useFeatureFlag('checkout-experiment');

  switch (variant) {
    case 'variant-a':
      return <OptimizedCheckout />;
    case 'variant-b':
      return <ExpressCheckout />;
    default:
      return <OriginalCheckout />;
  }
}
```

### Track Conversion

```tsx
import { useFlagAnalytics } from '@/lib/flags';

function CheckoutSuccess() {
  const { trackConversion } = useFlagAnalytics();

  useEffect(() => {
    trackConversion('checkout-experiment', {
      revenue: orderTotal,
      items: orderItems.length,
    });
  }, []);

  return <SuccessMessage />;
}
```

## Variant Configuration

### Simple A/B Test

```typescript
{
  key: 'button-color-test',
  enabled: true,
  variants: [
    { key: 'control', weight: 50 },  // Blue button (current)
    { key: 'variant', weight: 50 },  // Green button (new)
  ],
}
```

### A/B/C Test (Multivariate)

```typescript
{
  key: 'pricing-page-test',
  enabled: true,
  variants: [
    { key: 'control', weight: 25 },      // Current pricing
    { key: 'monthly', weight: 25 },      // Monthly emphasis
    { key: 'annual', weight: 25 },       // Annual emphasis
    { key: 'enterprise', weight: 25 },   // Enterprise focus
  ],
}
```

### Weighted Distribution

```typescript
{
  key: 'new-feature-test',
  enabled: true,
  variants: [
    { key: 'control', weight: 80 },    // 80% - current experience
    { key: 'variant', weight: 20 },    // 20% - new feature
  ],
}
```

### Variants with Payload

```typescript
{
  key: 'cta-button-test',
  enabled: true,
  variants: [
    {
      key: 'control',
      weight: 50,
      payload: {
        text: 'Sign Up',
        color: 'blue',
        size: 'medium',
      },
    },
    {
      key: 'variant',
      weight: 50,
      payload: {
        text: 'Get Started Free',
        color: 'green',
        size: 'large',
      },
    },
  ],
}
```

## Implementation Patterns

### Hook-Based Implementation

```tsx
import { useFeatureFlag } from '@/lib/flags';

function PricingPage() {
  const variant = useFeatureFlag('pricing-page-test');

  const config = {
    control: {
      showAnnual: false,
      discount: 0,
      highlight: 'monthly',
    },
    monthly: {
      showAnnual: false,
      discount: 10,
      highlight: 'monthly',
    },
    annual: {
      showAnnual: true,
      discount: 20,
      highlight: 'annual',
    },
  };

  return <PricingTable {...config[variant || 'control']} />;
}
```

### Component-Based Implementation

```tsx
import { FlagGate } from '@/lib/flags';

function HomePage() {
  return (
    <div>
      <FlagGate
        flagKey="hero-section-test"
        renderVariant={(variant) => {
          switch (variant) {
            case 'variant-a':
              return <HeroWithVideo />;
            case 'variant-b':
              return <HeroWithTestimonials />;
            default:
              return <HeroDefault />;
          }
        }}
      />
    </div>
  );
}
```

### Render Props Pattern

```tsx
import { FlagConfigurable } from '@/lib/flags';

function FeatureSection() {
  return (
    <FlagConfigurable flagKey="feature-layout-test">
      {({ variant, payload }) => {
        if (variant === 'grid') {
          return <GridLayout items={payload.items} />;
        }
        if (variant === 'list') {
          return <ListView items={payload.items} />;
        }
        return <DefaultView items={payload.items} />;
      }}
    </FlagConfigurable>
  );
}
```

### HOC Pattern

```tsx
import { withVariant } from '@/lib/flags';

const CheckoutFlow = withVariant('checkout-test', {
  control: OriginalCheckout,
  'variant-a': OptimizedCheckout,
  'variant-b': ExpressCheckout,
});

// Usage
function App() {
  return <CheckoutFlow />;
}
```

## Analytics Integration

### Automatic Exposure Tracking

```tsx
import { useFlagAnalytics } from '@/lib/flags';

function ExperimentComponent() {
  const { trackExposure } = useFlagAnalytics();

  useEffect(() => {
    // Automatically track when user sees this variant
    trackExposure('my-experiment', {
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    });
  }, [trackExposure]);

  return <Feature />;
}
```

### Conversion Tracking

```tsx
import { useFlagAnalytics } from '@/lib/flags';

function SignupButton() {
  const { trackConversion } = useFlagAnalytics();

  const handleClick = async () => {
    // Track button click
    trackConversion('cta-button-test', {
      action: 'click',
      timestamp: new Date(),
    });

    // Perform signup
    await signup();

    // Track successful signup
    trackConversion('cta-button-test', {
      action: 'signup-complete',
      timestamp: new Date(),
    });
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

### Google Analytics Integration

```tsx
import { useFlagAnalytics } from '@/lib/flags';
import { useEffect } from 'react';

function ExperimentTracker() {
  const { getVariant, trackExposure } = useFlagAnalytics();

  useEffect(() => {
    const variant = getVariant('pricing-test');

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'experiment_impression', {
        experiment_id: 'pricing-test',
        variant_id: variant,
      });
    }

    // Track exposure in our system
    trackExposure('pricing-test', {
      variant,
      timestamp: Date.now(),
    });
  }, []);

  return null;
}
```

### Segment Integration

```tsx
import { useFlagAnalytics } from '@/lib/flags';

function useSegmentTracking() {
  const { trackExposure, trackConversion } = useFlagAnalytics();

  const trackVariantExposure = (experimentId, variant) => {
    // Track in our system
    trackExposure(experimentId, { variant });

    // Send to Segment
    if (window.analytics) {
      window.analytics.track('Experiment Viewed', {
        experiment_id: experimentId,
        variant_id: variant,
      });
    }
  };

  const trackVariantConversion = (experimentId, event, data) => {
    // Track in our system
    trackConversion(experimentId, { event, ...data });

    // Send to Segment
    if (window.analytics) {
      window.analytics.track('Experiment Conversion', {
        experiment_id: experimentId,
        event_name: event,
        ...data,
      });
    }
  };

  return { trackVariantExposure, trackVariantConversion };
}
```

## Statistical Analysis

### Sample Size Calculation

```typescript
interface SampleSizeParams {
  baselineConversion: number;  // Current conversion rate (e.g., 0.05 = 5%)
  minimumDetectableEffect: number;  // Minimum improvement (e.g., 0.20 = 20%)
  significanceLevel: number;  // Usually 0.05 (95% confidence)
  statisticalPower: number;   // Usually 0.80 (80% power)
}

function calculateSampleSize(params: SampleSizeParams): number {
  const { baselineConversion, minimumDetectableEffect, significanceLevel, statisticalPower } = params;

  // Simplified calculation
  const effect = baselineConversion * minimumDetectableEffect;
  const zAlpha = 1.96;  // For 95% confidence
  const zBeta = 0.84;   // For 80% power

  const n = Math.ceil(
    2 * Math.pow(zAlpha + zBeta, 2) *
    baselineConversion * (1 - baselineConversion) /
    Math.pow(effect, 2)
  );

  return n;
}

// Example usage
const requiredSampleSize = calculateSampleSize({
  baselineConversion: 0.05,      // 5% current conversion
  minimumDetectableEffect: 0.20, // 20% improvement
  significanceLevel: 0.05,       // 95% confidence
  statisticalPower: 0.80,        // 80% power
});

console.log(`Need ${requiredSampleSize} users per variant`);
```

### Conversion Rate Analysis

```typescript
interface VariantResults {
  variant: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
}

function analyzeResults(results: VariantResults[]): {
  winner: string | null;
  significant: boolean;
  confidence: number;
} {
  const control = results.find(r => r.variant === 'control');
  const variants = results.filter(r => r.variant !== 'control');

  let winner = null;
  let maxImprovement = 0;
  let significant = false;

  for (const variant of variants) {
    const improvement = (variant.conversionRate - control!.conversionRate) / control!.conversionRate;

    // Chi-square test for statistical significance
    const expected = variant.impressions * control!.conversionRate;
    const chiSquare = Math.pow(variant.conversions - expected, 2) / expected;
    const pValue = 1 - chiSquareCDF(chiSquare, 1);

    if (improvement > maxImprovement && pValue < 0.05) {
      winner = variant.variant;
      maxImprovement = improvement;
      significant = true;
    }
  }

  return {
    winner,
    significant,
    confidence: significant ? 95 : 0,
  };
}
```

### Real-Time Monitoring

```tsx
import { useFlagAnalytics } from '@/lib/flags';
import { useState, useEffect } from 'react';

function ExperimentDashboard({ experimentId }) {
  const [results, setResults] = useState(null);
  const { getExperimentData } = useFlagAnalytics();

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getExperimentData(experimentId);
      setResults(data);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [experimentId]);

  if (!results) return <Loading />;

  return (
    <div>
      <h2>Experiment: {experimentId}</h2>
      {results.variants.map(variant => (
        <div key={variant.key}>
          <h3>{variant.key}</h3>
          <p>Impressions: {variant.impressions}</p>
          <p>Conversions: {variant.conversions}</p>
          <p>Conversion Rate: {(variant.conversionRate * 100).toFixed(2)}%</p>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Define Clear Success Metrics

```typescript
const experimentConfig = {
  key: 'checkout-optimization',
  goal: 'purchase-completion',
  successMetrics: {
    primary: 'conversion-rate',
    secondary: ['average-order-value', 'cart-abandonment'],
  },
  minimumDetectableEffect: 0.10, // 10% improvement
  minimumSampleSize: 1000,
};
```

### 2. Consistent User Assignment

```tsx
// Good: User always sees same variant
<FeatureFlagProvider
  user={{ id: currentUser.id }}
  provider={provider}
/>

// Bad: User might see different variants
<FeatureFlagProvider
  user={{ id: Math.random() }}
  provider={provider}
/>
```

### 3. Run Tests Long Enough

```typescript
const testDuration = {
  minimum: 7,  // At least 1 week
  optimal: 14, // 2 weeks recommended
  maximum: 30, // Don't run longer than 30 days
};

// Account for day-of-week and weekend effects
const shouldStopTest = (startDate: Date): boolean => {
  const daysSinceStart = daysBetween(startDate, new Date());
  return daysSinceStart >= testDuration.minimum &&
         daysSinceStart % 7 === 0; // Complete full weeks
};
```

### 4. Avoid Peeking

```typescript
// Bad: Checking results daily and stopping early
if (improvementRate > 0.05) {
  stopTest(); // ❌ Increases false positive rate
}

// Good: Pre-define test duration and sample size
if (sampleSize >= minimumSampleSize && daysRun >= minimumDays) {
  analyzeResults();
}
```

### 5. Control External Factors

```typescript
const experimentFilters = {
  // Only include users who meet criteria
  includeIf: (user) => {
    return (
      user.accountAge > 30 &&        // Established users only
      !user.isBetaTester &&           // Exclude beta testers
      user.locale === 'en-US'         // Same locale
    );
  },
};
```

### 6. Document Everything

```typescript
const experimentDocumentation = {
  id: 'checkout-v2-2024',
  hypothesis: 'Reducing checkout steps from 3 to 2 will increase completion rate',
  startDate: '2024-01-15',
  endDate: '2024-01-29',
  variants: [
    { key: 'control', description: '3-step checkout' },
    { key: 'variant', description: '2-step checkout' },
  ],
  targetMetrics: {
    primary: 'checkout-completion-rate',
    secondary: ['time-to-complete', 'error-rate'],
  },
  expectedImpact: '+15% completion rate',
  riskAssessment: 'Low - can revert immediately if issues arise',
};
```

## Advanced Techniques

### Staged Rollout

```typescript
const stagedRollout = {
  phase1: {
    duration: '1 week',
    allocation: { control: 90, variant: 10 },
  },
  phase2: {
    duration: '1 week',
    allocation: { control: 50, variant: 50 },
  },
  phase3: {
    duration: '1 week',
    allocation: { control: 10, variant: 90 },
  },
  phase4: {
    duration: 'ongoing',
    allocation: { control: 0, variant: 100 },
  },
};
```

### Multivariate Testing

```tsx
import { useFeatureFlags } from '@/lib/flags';

function LandingPage() {
  const flags = useFeatureFlags([
    'hero-variant',
    'cta-variant',
    'pricing-variant',
  ]);

  return (
    <div>
      <Hero variant={flags['hero-variant']} />
      <CTA variant={flags['cta-variant']} />
      <Pricing variant={flags['pricing-variant']} />
    </div>
  );
}
```

### Personalization Based on Segments

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { useAuth } from '@/lib/auth';

function PersonalizedCheckout() {
  const { user } = useAuth();
  const variant = useFeatureFlag('checkout-experiment');

  // Different variants for different user segments
  if (user.segment === 'enterprise') {
    return <EnterpriseCheckout />;
  }

  switch (variant) {
    case 'variant-a':
      return <OptimizedCheckout />;
    default:
      return <StandardCheckout />;
  }
}
```

## Troubleshooting

### Issue: Inconsistent Variant Assignment

**Solution:** Ensure consistent user ID:

```tsx
<FeatureFlagProvider
  user={{ id: currentUser.id }} // Consistent ID required
  provider={provider}
/>
```

### Issue: Sample Size Too Small

**Solution:** Calculate required sample size upfront:

```typescript
const sampleSize = calculateSampleSize({
  baselineConversion: 0.05,
  minimumDetectableEffect: 0.20,
  significanceLevel: 0.05,
  statisticalPower: 0.80,
});

console.log(`Run test until ${sampleSize} users per variant`);
```

### Issue: Results Not Tracking

**Solution:** Verify analytics integration:

```tsx
const { trackExposure } = useFlagAnalytics();

useEffect(() => {
  trackExposure('experiment-id');
  console.log('Exposure tracked'); // Debug log
}, []);
```

## Related Documentation

### Feature Flags System
- [README.md](./README.md) - Feature flags overview
- [HOOKS.md](./HOOKS.md) - Flag hooks API
- [COMPONENTS.md](./COMPONENTS.md) - Flag components
- [INTEGRATION.md](./INTEGRATION.md) - Analytics integration
- [PROVIDER.md](./PROVIDER.md) - Provider setup

### Configuration & State
- [Config System](../config/README.md) - A/B test configuration
- [Config Dynamic](../config/DYNAMIC.md) - Dynamic A/B test config
- [State System](../state/README.md) - Variant state management
- [State Stores](../state/STORES.md) - A/B test state stores

### Integration
- [Flag Integration](../integration/FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md) - Complete integration
- [API Integration](../api/README.md) - A/B testing with API

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
