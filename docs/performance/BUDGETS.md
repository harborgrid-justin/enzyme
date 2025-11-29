# Performance Budgets

> Enforce performance budgets with automatic degradation strategies to maintain exceptional user experiences.

## Table of Contents

- [Overview](#overview)
- [Budget Types](#budget-types)
- [Budget Configuration](#budget-configuration)
- [Budget Enforcement](#budget-enforcement)
- [Degradation Strategies](#degradation-strategies)
- [Budget-Aware Components](#budget-aware-components)
- [Monitoring Budgets](#monitoring-budgets)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

Performance budgets are limits on metrics that affect site performance. Enzyme provides automatic budget enforcement with graceful degradation to ensure your application stays fast even under challenging conditions.

### Why Performance Budgets?

- **Prevent Regressions**: Catch performance issues before they reach production
- **Guide Development**: Clear targets for optimization efforts
- **Automatic Degradation**: Gracefully reduce features under pressure
- **Team Alignment**: Shared understanding of performance goals

### Budget Categories

1. **Time Budgets**: LCP, INP, TTI, TTFB
2. **Size Budgets**: JavaScript, CSS, Images, Total
3. **Memory Budgets**: Heap usage, DOM nodes
4. **Quantity Budgets**: Requests, Long tasks, Scripts

## Budget Types

### Time Budgets

Limits on timing metrics:

```typescript
const timeBudgets = {
  // Core Web Vitals
  LCP: { warning: 2000, critical: 2500 },    // Largest Contentful Paint
  INP: { warning: 150, critical: 200 },      // Interaction to Next Paint
  FCP: { warning: 1500, critical: 1800 },    // First Contentful Paint
  TTFB: { warning: 600, critical: 800 },     // Time to First Byte

  // Custom timing
  TTI: { warning: 3000, critical: 3500 },    // Time to Interactive
  renderTime: { warning: 16, critical: 33 }, // Frame budget
  apiResponse: { warning: 500, critical: 1000 },
};
```

### Size Budgets

Limits on resource sizes:

```typescript
const sizeBudgets = {
  // Bundle sizes (bytes)
  js: { warning: 250_000, critical: 300_000 },
  css: { warning: 40_000, critical: 50_000 },
  images: { warning: 400_000, critical: 500_000 },
  fonts: { warning: 80_000, critical: 100_000 },
  total: { warning: 800_000, critical: 1_000_000 },

  // Per-page limits
  initialBundle: { warning: 180_000, critical: 200_000 },
  asyncChunk: { warning: 80_000, critical: 100_000 },
};
```

### Memory Budgets

Limits on memory usage:

```typescript
const memoryBudgets = {
  // Heap usage (bytes)
  heapUsed: { warning: 50_000_000, critical: 100_000_000 },
  heapTotal: { warning: 100_000_000, critical: 150_000_000 },

  // DOM nodes
  domNodes: { warning: 1500, critical: 2000 },

  // Cache sizes
  cacheSize: { warning: 10_000_000, critical: 20_000_000 },
};
```

### Quantity Budgets

Limits on resource counts:

```typescript
const quantityBudgets = {
  // Network requests
  requests: { warning: 50, critical: 100 },
  scripts: { warning: 10, critical: 15 },
  stylesheets: { warning: 5, critical: 8 },

  // Performance
  longTasks: { warning: 3, critical: 5 },
  layoutShifts: { warning: 0.05, critical: 0.1 },
};
```

## Budget Configuration

### Basic Configuration

```typescript
import { PerformanceBudgetManager } from '@/lib/performance';

const budgetManager = new PerformanceBudgetManager({
  budgets: {
    // Time budgets (ms)
    LCP: { warning: 2000, critical: 2500 },
    INP: { warning: 150, critical: 200 },
    FCP: { warning: 1500, critical: 1800 },

    // Size budgets (bytes)
    'bundle-js': { warning: 250_000, critical: 300_000 },
    'bundle-css': { warning: 40_000, critical: 50_000 },

    // Memory budgets (bytes)
    'heap-usage': { warning: 50_000_000, critical: 100_000_000 },

    // Custom budgets
    'api-response': { warning: 500, critical: 1000 },
  },

  // Degradation strategies
  degradationStrategies: {
    'bundle-js': 'lazy-load',
    'bundle-css': 'inline-critical',
    'heap-usage': 'clear-caches',
    'api-response': 'use-cached',
  },

  // Callbacks
  onViolation: (violation) => {
    console.warn('Budget violation:', violation);
  },

  onDegradation: (strategy) => {
    console.log('Degradation applied:', strategy);
  },

  // Enforcement
  enforceInProduction: true,
  enforceInDevelopment: true,
});

// Start enforcing budgets
budgetManager.start();
```

### Advanced Configuration

```typescript
const budgetManager = new PerformanceBudgetManager({
  budgets: {
    // Conditional budgets
    LCP: {
      warning: 2000,
      critical: 2500,
      // Different thresholds per device
      mobile: { warning: 2500, critical: 3000 },
      tablet: { warning: 2000, critical: 2500 },
      desktop: { warning: 1500, critical: 2000 },
    },
  },

  // Context-aware enforcement
  context: {
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
    userTier: getUserTier(), // premium, standard, free
  },

  // Progressive enforcement
  progressive: {
    enabled: true,
    levels: [
      { threshold: 0.8, action: 'warn' },
      { threshold: 0.9, action: 'degrade-minor' },
      { threshold: 1.0, action: 'degrade-major' },
    ],
  },

  // Recovery
  recovery: {
    enabled: true,
    threshold: 0.7, // Restore when < 70% of budget
    cooldown: 5000,  // Wait 5s before restoring
  },
});
```

## Budget Enforcement

### Automatic Enforcement

```typescript
import { BudgetEnforcer } from '@/lib/performance';

const enforcer = new BudgetEnforcer({
  budgets: {
    LCP: { critical: 2500 },
    'bundle-js': { critical: 300_000 },
  },

  // Enforcement mode
  mode: 'auto', // 'auto' | 'manual' | 'advisory'

  // Auto-apply degradation
  autoDegradeOnViolation: true,

  onViolation: (violation) => {
    // Log violation
    console.error('Budget exceeded:', {
      metric: violation.metric,
      value: violation.value,
      budget: violation.budget,
      overage: violation.overage,
    });

    // Report to analytics
    analytics.track('Budget Violation', violation);
  },

  onEnforcement: (action) => {
    console.log('Enforcement action:', action);
  },
});

enforcer.start();
```

### Manual Enforcement

```typescript
import { getBudgetManager } from '@/lib/performance';

const budgetManager = getBudgetManager();

// Check budget manually
const isWithinBudget = budgetManager.checkBudget('LCP', 2800);

if (!isWithinBudget) {
  // Apply degradation
  budgetManager.applyDegradation('LCP');
}

// Get budget status
const status = budgetManager.getStatus();
console.log('Budget status:', status);

// Get violations
const violations = budgetManager.getViolations();
console.log('Current violations:', violations);
```

## Degradation Strategies

### Built-in Strategies

```typescript
const strategies = {
  // Code splitting
  'lazy-load': {
    description: 'Lazy load non-critical components',
    apply: () => {
      // Defer loading of heavy components
      return import('./HeavyComponent');
    },
  },

  // Bundle optimization
  'reduce-bundle': {
    description: 'Load minimal bundle',
    apply: () => {
      // Use lighter alternatives
      return import('./LightweightComponent');
    },
  },

  // Resource optimization
  'reduce-quality': {
    description: 'Reduce image/video quality',
    apply: () => {
      return {
        imageQuality: 'low',
        videoQuality: 'sd',
      };
    },
  },

  // Cache management
  'clear-caches': {
    description: 'Clear non-essential caches',
    apply: () => {
      queryClient.clear();
      imageCache.clear();
    },
  },

  // Feature reduction
  'disable-animations': {
    description: 'Disable animations',
    apply: () => {
      document.body.classList.add('reduced-motion');
    },
  },

  // Data reduction
  'reduce-data': {
    description: 'Reduce data loaded',
    apply: () => {
      return {
        itemsPerPage: 10, // instead of 50
        enablePagination: true,
      };
    },
  },
};
```

### Custom Strategies

```typescript
import { PerformanceBudgetManager } from '@/lib/performance';

const budgetManager = new PerformanceBudgetManager({
  budgets: {
    'api-response': { critical: 1000 },
  },

  degradationStrategies: {
    'api-response': {
      name: 'use-cached-data',
      description: 'Use cached data when API is slow',

      apply: async () => {
        // Try cache first
        const cached = await cache.get('data');
        if (cached) {
          return { data: cached, source: 'cache' };
        }

        // Fall back to API
        const data = await fetch('/api/data');
        return { data, source: 'api' };
      },

      restore: async () => {
        // Restore normal behavior
        cache.clear();
      },
    },
  },
});
```

### Gradual Degradation

```typescript
const budgetManager = new PerformanceBudgetManager({
  budgets: {
    'heap-usage': {
      warning: 50_000_000,
      critical: 100_000_000,
    },
  },

  degradationStrategies: {
    'heap-usage': [
      {
        threshold: 0.8, // At 80%
        apply: () => {
          // Level 1: Reduce cache size
          cache.resize(0.5);
        },
      },
      {
        threshold: 0.9, // At 90%
        apply: () => {
          // Level 2: Clear non-essential data
          clearNonEssentialData();
        },
      },
      {
        threshold: 1.0, // At 100%
        apply: () => {
          // Level 3: Emergency cleanup
          emergencyCleanup();
        },
      },
    ],
  },
});
```

## Budget-Aware Components

### usePerformanceBudget Hook

```tsx
import { usePerformanceBudget } from '@/lib/performance';

function Component() {
  const {
    isWithinBudget,
    violations,
    currentUsage,
    degradedMode,
  } = usePerformanceBudget('bundle-js');

  if (degradedMode) {
    return <LightweightVersion />;
  }

  return (
    <div>
      {!isWithinBudget && <BudgetWarning violations={violations} />}
      <FullVersion />
    </div>
  );
}
```

### Conditional Features

```tsx
import { useBudgetConditional } from '@/lib/performance';

function Dashboard() {
  const { canLoad, reason } = useBudgetConditional({
    requiredBudget: {
      js: 50_000,      // Needs 50KB headroom
      memory: 10_000_000, // Needs 10MB headroom
    },
  });

  if (!canLoad) {
    return (
      <div>
        <SimpleDashboard />
        <Notice>Some features disabled: {reason}</Notice>
      </div>
    );
  }

  return <FullDashboard />;
}
```

### Adaptive Loading

```tsx
import { useAdaptiveBudget } from '@/lib/performance';

function MediaGallery() {
  const {
    quality,
    itemsToShow,
    enableAnimations,
  } = useAdaptiveBudget({
    budgets: ['bundle-js', 'heap-usage', 'LCP'],
  });

  return (
    <Gallery
      quality={quality}
      items={items.slice(0, itemsToShow)}
      animate={enableAnimations}
    />
  );
}
```

## Monitoring Budgets

### Budget Dashboard

```tsx
import { BudgetDashboard } from '@/lib/performance';

function App() {
  return (
    <div>
      <YourApp />

      {import.meta.env.DEV && (
        <BudgetDashboard
          position="bottom-left"
          showViolations
          showTrends
          enableExport
        />
      )}
    </div>
  );
}
```

### Budget Metrics

```tsx
import { useBudgetMetrics } from '@/lib/performance';

function BudgetMonitor() {
  const {
    budgets,
    violations,
    utilizationRate,
    degradationActive,
  } = useBudgetMetrics();

  return (
    <div className="budget-monitor">
      {Object.entries(budgets).map(([name, budget]) => (
        <BudgetCard
          key={name}
          name={name}
          current={budget.current}
          limit={budget.limit}
          utilization={budget.utilization}
          violated={budget.violated}
        />
      ))}

      {violations.length > 0 && (
        <ViolationList violations={violations} />
      )}
    </div>
  );
}
```

### Real-time Alerts

```typescript
import { BudgetAlertManager } from '@/lib/performance';

const alertManager = new BudgetAlertManager({
  // Alert on violations
  onViolation: (violation) => {
    showNotification({
      type: 'error',
      title: 'Performance Budget Exceeded',
      message: `${violation.metric}: ${violation.overage}% over budget`,
    });
  },

  // Alert on approaching limits
  onWarning: (warning) => {
    showNotification({
      type: 'warning',
      title: 'Approaching Budget Limit',
      message: `${warning.metric}: ${warning.usage}% of budget used`,
    });
  },

  // Thresholds for warnings
  warningThreshold: 0.8, // Warn at 80%
});
```

## CI/CD Integration

### Build-time Budget Enforcement

```javascript
// webpack.config.js
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { PerformanceBudgetPlugin } from '@/lib/performance/webpack';

export default {
  plugins: [
    new PerformanceBudgetPlugin({
      budgets: {
        'main.js': 300_000,      // 300KB
        'vendor.js': 200_000,    // 200KB
        'styles.css': 50_000,    // 50KB
        'total': 800_000,        // 800KB
      },

      // Fail build on violation
      failOnViolation: true,

      // Or just warn
      warnOnViolation: true,

      // Report
      generateReport: true,
      reportPath: './budget-report.json',
    }),

    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
    }),
  ],
};
```

### CI Pipeline Integration

```yaml
# .github/workflows/performance-budgets.yml
name: Performance Budgets

on: [push, pull_request]

jobs:
  check-budgets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check Performance Budgets
        run: npm run check:budgets
        continue-on-error: false

      - name: Upload Budget Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: budget-report
          path: budget-report.json

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const report = require('./budget-report.json');
            const violations = report.violations;

            if (violations.length > 0) {
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `⚠️ Performance Budget Violations:\n\n${violations.map(v => `- ${v.metric}: ${v.overage}% over budget`).join('\n')}`
              });
            }
```

### Lighthouse CI Integration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Budget assertions
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 50000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 500000 }],

        // Metric assertions
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## Best Practices

### 1. Set Realistic Budgets

```typescript
// Start with current metrics + buffer
const budgets = {
  LCP: {
    // Current: 2000ms
    warning: 2200,  // +10%
    critical: 2400, // +20%
  },
};

// Gradually tighten over time
```

### 2. Monitor Trends

```typescript
import { BudgetTrendAnalyzer } from '@/lib/performance';

const analyzer = new BudgetTrendAnalyzer({
  trackingPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days

  onTrendChange: (trend) => {
    if (trend.direction === 'increasing' && trend.rate > 0.1) {
      console.warn(`${trend.metric} growing at ${trend.rate * 100}%/week`);
    }
  },
});
```

### 3. Context-Aware Budgets

```typescript
const budgetManager = new PerformanceBudgetManager({
  budgets: {
    LCP: getDeviceType() === 'mobile'
      ? { critical: 3000 }  // More lenient on mobile
      : { critical: 2500 }, // Stricter on desktop
  },
});
```

### 4. Graceful Degradation

```tsx
// Always provide fallbacks
function Feature() {
  const { canLoad } = useBudgetConditional({ js: 50_000 });

  if (!canLoad) {
    return <SimpleVersion />;
  }

  return <FullVersion />;
}
```

### 5. Test Budget Impact

```typescript
// Measure impact of degradation
const before = measurePerformance();

applyDegradation('reduce-quality');

const after = measurePerformance();

console.log('Improvement:', {
  loadTime: before.loadTime - after.loadTime,
  bundleSize: before.bundleSize - after.bundleSize,
});
```

## Related Documentation

- [Web Vitals](./WEB_VITALS.md) - Core Web Vitals metrics
- [Performance Monitoring](./MONITORING.md) - Real-time monitoring
- [Observatory Dashboard](./OBSERVATORY.md) - Performance dashboard
- [Lazy Loading](./LAZY_LOADING.md) - Resource optimization
- [Performance Guide](../PERFORMANCE.md) - Template performance
- [Configuration Reference](./CONFIG.md) - Performance configuration

---

**Last Updated:** 2025-11-29
**Version:** 1.0.0
