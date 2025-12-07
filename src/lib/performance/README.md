# Performance Module

> **Purpose:** Comprehensive performance monitoring, optimization, and budgeting system for achieving world-class Core
> Web Vitals.

## Overview

The Performance module provides a complete solution for measuring, monitoring, and optimizing React application
performance. It automatically tracks Core Web Vitals (LCP, INP, CLS, FCP, TTFB), monitors long tasks, manages memory
pressure, and enforces performance budgets with automatic degradation strategies.

This module goes far beyond basic performance monitoring by providing predictive prefetching, intelligent render
scheduling, memory optimization, critical CSS extraction, adaptive loading based on network conditions, and real-time
performance dashboards. It includes both proactive optimization (budgets, lazy loading, code splitting) and reactive
monitoring (RUM, regression detection, alerting).

Perfect for teams committed to exceptional user experience, this module helps you meet Google's Core Web Vitals
thresholds, identify performance regressions before they reach production, and automatically optimize your application
based on device capabilities and network conditions.

## Key Features

- Core Web Vitals collection (LCP, INP, CLS, FCP, TTFB)
- Performance budgets with automatic enforcement
- Long task detection and blocking time tracking
- Memory pressure monitoring and leak detection
- Render performance tracking and optimization
- Network quality detection and adaptive loading
- Predictive prefetching based on user behavior
- Intelligent render scheduling (frame budget)
- Critical CSS extraction and injection
- Bundle size optimization and analysis
- Real User Monitoring (RUM) with session tracking
- Performance regression detection
- Idle callback scheduling
- Virtual list optimization
- Component render profiling
- Resource timing analysis
- Progressive image loading
- Performance Observatory dashboard

## Quick Start

```tsx
import {
  initPerformanceMonitoring,
  PerformanceObservatory,
  usePerformanceBudget,
  useLongTaskDetector,
} from '@/lib/performance';

// 1. Initialize monitoring at app startup
await initPerformanceMonitoring({
  debug: import.meta.env.DEV,
  reportToAnalytics: import.meta.env.PROD,
  onVitalMetric: (metric) => {
    console.log(`${metric.name}: ${metric.value}`);
  },
});

// 2. Add performance dashboard
function App() {
  return (
    <div>
      {import.meta.env.DEV && <PerformanceObservatory />}
      <YourApp />
    </div>
  );
}

// 3. Monitor budget violations
function ExpensiveComponent() {
  const { isViolated, degrade } = usePerformanceBudget('render-time');

  if (isViolated && degrade) {
    return <SimpleVersion />;
  }

  return <FullFeaturedVersion />;
}
```

## Exports

### Initialization

- `initPerformanceMonitoring()` - Start all monitoring systems
- `startPerformanceMonitoring()` - Start specific monitors
- `stopPerformanceMonitoring()` - Stop monitoring

### Core Monitors

- `PerformanceMonitor` - Long tasks, memory, frame rate, resources
- `VitalsCollector` - Core Web Vitals tracking
- `RenderTracker` - Component render performance
- `NetworkPerformanceAnalyzer` - Network timing and quality

### Budgets

- `PerformanceBudgetManager` - Define and enforce budgets
- `BudgetEnforcer` - Automatic enforcement with degradation
- `usePerformanceBudget` - Hook for budget-aware components
- `useBudgetStatus` - Check budget violations
- `useDegradedMode` - Access degradation state

### Components

- `PerformanceObservatory` - Real-time dashboard
- `PerformanceProvider` - Context provider
- `RenderTracker` - HOC for render tracking

### Hooks

- `usePerformanceBudget` - Monitor specific budget
- `useRenderMetrics` - Component render stats
- `useLongTaskDetector` - Detect long tasks
- `useMemoryPressure` - Memory pressure level
- `useNetworkQuality` - Network quality metrics
- `usePredictivePrefetch` - ML-based prefetching
- `useAdaptiveImageQuality` - Load images based on network
- `useDeferredRender` - Defer expensive renders
- `useIdleHydration` - Hydrate during idle time

### Optimization

- `PredictivePrefetchEngine` - AI-driven prefetching
- `RenderScheduler` - Schedule work in idle frames
- `MemoryGuardian` - Memory leak prevention
- `BundleOptimizer` - Runtime bundle optimization
- `CriticalCSSExtractor` - Extract and inject critical CSS
- `IdleScheduler` - requestIdleCallback utilities

### Profiling

- `PerformanceProfiler` - Record performance samples
- `RegressionDetector` - Detect performance regressions
- `RealUserMonitoring` - RUM with session tracking

### Utilities

- `formatMetricValue()` - Format metrics for display
- `calculateRating()` - Get metric rating (good/needs-improvement/poor)
- `getNetworkQuality()` - Get network quality metrics
- `isSlowConnection()` - Check for slow network
- `getMemoryPressureLevel()` - Check memory pressure
- `runWhenIdle()` - Execute during idle time
- `yieldToMain()` - Yield to main thread

### Types

- `VitalMetricName` - Core Web Vitals metric names
- `PerformanceRating` - Rating (good | needs-improvement | poor)
- `PerformanceBudget` - Budget definition
- `BudgetViolation` - Budget violation details
- `PerformanceMetrics` - Comprehensive metrics snapshot
- `NetworkQuality` - Network quality assessment
- `MemoryPressureLevel` - Memory pressure state

## Architecture

The performance module uses a layered monitoring approach:

```
┌──────────────────────────────────────┐
│      Application Components           │
└─────────────┬────────────────────────┘
              │
┌─────────────┴────────────────────────┐
│     Performance Hooks & HOCs          │
│  (budgets, adaptive loading, etc.)   │
└─────────────┬────────────────────────┘
              │
┌─────────────┴────────────────────────┐
│         Monitors Layer                │
│  (Vitals, Render, Network, Memory)   │
└─────────────┬────────────────────────┘
              │
┌─────────────┴────────────────────────┐
│    Browser Performance APIs           │
│  (PerformanceObserver, Navigation,   │
│   Memory, Network Information)       │
└──────────────────────────────────────┘
```

### Core Web Vitals Targets

- **LCP** (Largest Contentful Paint): < 2500ms
- **INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1800ms
- **TTFB** (Time to First Byte): < 800ms

## Common Patterns

### Pattern 1: Budget-Aware Components

```tsx
import { usePerformanceBudget } from '@/lib/performance';

function VideoPlayer() {
  const budget = usePerformanceBudget('video-playback', {
    threshold: 100, // ms
    degradationStrategy: 'reduce-quality',
  });

  // Automatically reduce quality if budget violated
  const quality = budget.isViolated ? 'low' : 'high';

  return <Video quality={quality} />;
}
```

### Pattern 2: Adaptive Loading Based on Network

```tsx
import { useNetworkQuality, useAdaptiveImageQuality } from '@/lib/performance';

function ProductImage({ src, alt }) {
  const { quality } = useAdaptiveImageQuality({
    sizes: {
      high: `${src}-hd.jpg`,
      medium: `${src}-md.jpg`,
      low: `${src}-sd.jpg`,
    },
  });

  return <img src={quality.src} alt={alt} loading="lazy" />;
}

function Dashboard() {
  const { effectiveType, saveData } = useNetworkQuality();

  // Skip non-critical features on slow connections
  if (effectiveType === '2g' || saveData) {
    return <SimpleDashboard />;
  }

  return <FullDashboard />;
}
```

### Pattern 3: Predictive Prefetching

```tsx
import { usePredictivePrefetch, PredictiveLink } from '@/lib/performance';

function Navigation() {
  const { prefetch } = usePredictivePrefetch();

  // Automatically learns navigation patterns
  return (
    <nav>
      <PredictiveLink to="/dashboard">
        Dashboard {/* Prefetched based on learned patterns */}
      </PredictiveLink>

      <PredictiveLink to="/reports" priority="high">
        Reports {/* Higher priority prefetch */}
      </PredictiveLink>
    </nav>
  );
}
```

### Pattern 4: Deferred Rendering for Performance

```tsx
import { useDeferredRender, useIdleHydration } from '@/lib/performance';

function ExpensiveComponent() {
  const { shouldRender, isDeferred } = useDeferredRender({
    delay: 100, // Wait 100ms after mount
    priority: 'low',
  });

  if (!shouldRender) {
    return <Skeleton />;
  }

  return <ExpensiveContent />;
}

// Hydrate during idle time
function BelowFold() {
  useIdleHydration({
    timeout: 5000, // Max 5s wait
  });

  return <BelowFoldContent />;
}
```

### Pattern 5: Long Task Detection

```tsx
import { useLongTaskDetector } from '@/lib/performance';

function DataGrid({ data }) {
  const { longTasks, totalBlockingTime } = useLongTaskDetector({
    threshold: 50, // Report tasks > 50ms
    onLongTask: (task) => {
      console.warn('Long task detected:', task.duration);
    },
  });

  // Process data in chunks to avoid long tasks
  const processedData = useMemo(() => {
    return processInChunks(data, 100); // 100 items per chunk
  }, [data]);

  return <Table data={processedData} />;
}
```

### Pattern 6: Memory Pressure Awareness

```tsx
import { useMemoryPressure, useMemoryCleanup } from '@/lib/performance';

function ImageGallery({ images }) {
  const { level, trend } = useMemoryPressure();

  // Clean up on memory pressure
  useMemoryCleanup(() => {
    // Clear image cache
    imageCache.clear();
  }, [level]);

  // Reduce loaded images on high memory pressure
  const maxImages = level === 'critical' ? 10 : level === 'warning' ? 50 : 100;

  return (
    <div>
      {images.slice(0, maxImages).map(img => (
        <Image key={img.id} src={img.url} />
      ))}
    </div>
  );
}
```

## Configuration

### Performance Monitoring Configuration

```tsx
import { initPerformanceMonitoring } from '@/lib/performance';

await initPerformanceMonitoring({
  // Debug mode
  debug: import.meta.env.DEV,

  // Analytics reporting
  reportToAnalytics: import.meta.env.PROD,
  analyticsEndpoint: '/api/analytics/performance',
  sampleRate: 0.1, // Report 10% of sessions

  // Callbacks
  onVitalMetric: (metric) => {
    // Send to analytics
    gtag('event', metric.name, {
      value: metric.value,
      metric_rating: metric.rating,
    });
  },

  onBudgetViolation: (violation) => {
    console.warn('Budget violated:', violation);
  },

  onLongTask: (task) => {
    if (task.duration > 100) {
      console.warn('Long task:', task);
    }
  },

  onMemoryPressure: (pressure) => {
    if (pressure === 'critical') {
      // Trigger emergency cleanup
      clearCaches();
    }
  },
});
```

### Budget Configuration

```tsx
import { PerformanceBudgetManager } from '@/lib/performance';

const budgetManager = new PerformanceBudgetManager({
  budgets: {
    // Time budgets
    'lcp': { warning: 2000, critical: 2500 },
    'inp': { warning: 150, critical: 200 },
    'fcp': { warning: 1500, critical: 1800 },

    // Size budgets
    'bundle-size': { warning: 200_000, critical: 250_000 }, // bytes
    'image-size': { warning: 100_000, critical: 200_000 },

    // Memory budgets
    'heap-usage': { warning: 50_000_000, critical: 100_000_000 }, // bytes

    // Custom budgets
    'api-response': { warning: 500, critical: 1000 }, // ms
  },

  // Degradation strategies
  degradationStrategies: {
    'bundle-size': 'reduce-features',
    'heap-usage': 'clear-caches',
    'api-response': 'show-cached',
  },

  // Violation handler
  onViolation: (violation) => {
    console.error(`Budget ${violation.metric} violated:`, violation);
  },
});
```

## Testing

### Testing Performance

```tsx
import { render, waitFor } from '@testing-library/react';
import { VitalsCollector } from '@/lib/performance';

describe('Performance', () => {
  it('meets LCP budget', async () => {
    const collector = new VitalsCollector();

    render(<YourApp />);

    await waitFor(() => {
      const lcp = collector.getMetric('LCP');
      expect(lcp?.value).toBeLessThan(2500);
    });
  });
});
```

## Performance Considerations

1. **Observer Overhead**: Performance observers have minimal impact (~1-2ms)
2. **Bundle Size**: Core ~20KB, full suite ~50KB gzipped
3. **Memory**: Metrics stored in ring buffer (max 100 entries)
4. **Sampling**: Use sample rate < 1.0 in production to reduce overhead
5. **Network**: Batch analytics reports to reduce requests

## Troubleshooting

### Issue: High INP Score

**Solution:** Identify and break up long tasks:

```tsx
import { useLongTaskDetector, yieldToMain } from '@/lib/performance';

// Break up long operations
async function processLargeDataset(data) {
  for (let i = 0; i < data.length; i += 100) {
    processChunk(data.slice(i, i + 100));
    await yieldToMain(); // Yield to main thread
  }
}
```

### Issue: Poor LCP Performance

**Solution:** Use critical CSS and preload:

```tsx
import { useCriticalCSS, preloadAsset } from '@/lib/performance';

function App() {
  useCriticalCSS({
    extractFromComponents: ['Header', 'Hero'],
  });

  // Preload critical images
  useEffect(() => {
    preloadAsset('/hero-image.jpg', 'image');
  }, []);
}
```

### Issue: Memory Leaks

**Solution:** Use memory guardian:

```tsx
import { useMemoryGuard } from '@/lib/performance';

function Component() {
  useMemoryGuard({
    budget: 10_000_000, // 10MB
    onExceed: () => {
      // Clean up
    },
  });
}
```

### Issue: Slow Network Affecting UX

**Solution:** Implement adaptive loading:

```tsx
import { useNetworkQuality } from '@/lib/performance';

function MediaGallery() {
  const { effectiveType } = useNetworkQuality();

  if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    return <TextOnlyGallery />;
  }

  return <FullMediaGallery />;
}
```

## See Also

- [Performance Configuration](/reuse/templates/react/src/config/performance.config.ts)
- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [Prefetch Module](./prefetch/README.md)
- [Monitoring Module](./monitoring/README.md)
- [Advanced Performance](./advanced/README.md)

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
