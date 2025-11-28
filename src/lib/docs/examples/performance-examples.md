# Performance Examples

> 25+ practical performance optimization examples for the Harbor React Library.

## Table of Contents

- [Web Vitals](#web-vitals)
- [Performance Monitoring](#performance-monitoring)
- [Prefetching](#prefetching)
- [Progressive Hydration](#progressive-hydration)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)
- [Render Optimization](#render-optimization)
- [Advanced Patterns](#advanced-patterns)

---

## Web Vitals

### Example 1: Basic Vitals Collection

```tsx
import { initVitals } from '@/lib/performance';

// Initialize at app startup
const cleanup = initVitals({
  debug: import.meta.env.DEV,
  onMetric: (metric) => {
    console.log(`${metric.name}: ${metric.value}`);
  },
});

// Cleanup on unmount
// cleanup();
```

### Example 2: Report Vitals to Analytics

```tsx
import { initVitals } from '@/lib/performance';

initVitals({
  reportToAnalytics: true,
  sampleRate: 0.1, // 10% of users
  onMetric: (metric) => {
    analytics.track('Web Vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: window.location.pathname,
    });
  },
});
```

### Example 3: Vitals Display Component

```tsx
import { usePerformanceObservatory } from '@/lib/performance';

function VitalsDisplay() {
  const { vitals, overallScore } = usePerformanceObservatory();

  return (
    <div className="vitals-display">
      <div className="score">{overallScore}/100</div>
      <div className="metrics">
        <Metric name="LCP" value={vitals.LCP} unit="ms" good={2500} />
        <Metric name="INP" value={vitals.INP} unit="ms" good={200} />
        <Metric name="CLS" value={vitals.CLS} unit="" good={0.1} />
        <Metric name="FCP" value={vitals.FCP} unit="ms" good={1800} />
        <Metric name="TTFB" value={vitals.TTFB} unit="ms" good={800} />
      </div>
    </div>
  );
}

function Metric({ name, value, unit, good }) {
  const rating = value <= good ? 'good' : value <= good * 1.5 ? 'needs-improvement' : 'poor';

  return (
    <div className={`metric ${rating}`}>
      <span className="name">{name}</span>
      <span className="value">{value?.toFixed(1) || '-'}{unit}</span>
    </div>
  );
}
```

---

## Performance Monitoring

### Example 4: Long Task Detection

```tsx
import { useLongTaskDetector } from '@/lib/performance';

function App() {
  const { longTasks, totalBlockingTime } = useLongTaskDetector({
    threshold: 50,
    onLongTask: (task) => {
      console.warn(`Long task: ${task.duration}ms`);
    },
  });

  return (
    <div>
      {import.meta.env.DEV && (
        <div className="debug-info">
          Long tasks: {longTasks.length}
          TBT: {totalBlockingTime}ms
        </div>
      )}
      <MainContent />
    </div>
  );
}
```

### Example 5: Performance Budget Enforcement

```tsx
import { usePerformanceBudget } from '@/lib/performance';

function FeatureLoader() {
  const { isWithinBudget, violations } = usePerformanceBudget({
    js: { max: 300 * 1024 },
    interactive: { max: 3500 },
  });

  if (!isWithinBudget) {
    console.warn('Performance budget exceeded:', violations);
    return <LightweightFeature />;
  }

  return <FullFeature />;
}
```

### Example 6: Degraded Mode

```tsx
import { useDegradedMode } from '@/lib/performance';

function AdaptiveUI() {
  const { isDegraded, reason } = useDegradedMode();

  if (isDegraded) {
    return (
      <div>
        <p>Running in lite mode for better performance</p>
        <SimplifiedUI />
      </div>
    );
  }

  return <FullUI />;
}
```

---

## Prefetching

### Example 7: Hover Prefetch

```tsx
import { usePrefetchHandlers } from '@/lib/routing';

function NavLink({ to, children }) {
  const prefetchHandlers = usePrefetchHandlers(to);

  return (
    <Link to={to} {...prefetchHandlers}>
      {children}
    </Link>
  );
}
```

### Example 8: Predictive Prefetch

```tsx
import { usePredictivePrefetch, PredictiveLink } from '@/lib/performance';

function SmartNavigation() {
  return (
    <nav>
      <PredictiveLink to="/dashboard">Dashboard</PredictiveLink>
      <PredictiveLink to="/reports">Reports</PredictiveLink>
      <PredictiveLink to="/settings">Settings</PredictiveLink>
    </nav>
  );
}
```

### Example 9: Manual Predictive Prefetch

```tsx
import { usePredictivePrefetch } from '@/lib/performance';

function NavigationAnalytics() {
  const { predictNextRoute, prefetchPredicted, predictions } = usePredictivePrefetch({
    enableLearning: true,
    confidenceThreshold: 0.7,
  });

  useEffect(() => {
    const predicted = predictNextRoute(location.pathname);

    if (predicted && predicted.confidence > 0.7) {
      prefetchPredicted(predicted.path);
    }
  }, [location.pathname]);

  return null;
}
```

### Example 10: Network-Aware Prefetch

```tsx
import { useNetworkQuality, usePrefetchRoute } from '@/lib/performance';

function SmartLink({ to, children }) {
  const { quality, dataSaver } = useNetworkQuality();
  const prefetch = usePrefetchRoute();

  const shouldPrefetch = quality !== 'slow-2g' && !dataSaver;

  return (
    <Link
      to={to}
      onMouseEnter={() => shouldPrefetch && prefetch(to)}
    >
      {children}
    </Link>
  );
}
```

---

## Progressive Hydration

### Example 11: Basic Hydration Boundary

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function Page() {
  return (
    <div>
      <HydrationBoundary priority="critical">
        <Header />
      </HydrationBoundary>

      <HydrationBoundary priority="high">
        <MainContent />
      </HydrationBoundary>

      <HydrationBoundary priority="low" trigger="visible">
        <Sidebar />
      </HydrationBoundary>

      <HydrationBoundary priority="idle" trigger="idle">
        <Footer />
      </HydrationBoundary>
    </div>
  );
}
```

### Example 12: Hydration with Placeholder

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function ProductList() {
  return (
    <HydrationBoundary
      priority="normal"
      trigger="visible"
      placeholder={<ProductListSkeleton />}
    >
      <ProductGrid products={products} />
    </HydrationBoundary>
  );
}
```

### Example 13: Hydration Metrics

```tsx
import { useHydrationMetrics, useHydrationProgress } from '@/lib/hydration';

function HydrationIndicator() {
  const progress = useHydrationProgress();
  const metrics = useHydrationMetrics();

  if (progress === 100) return null;

  return (
    <div className="hydration-indicator">
      <div className="progress-bar" style={{ width: `${progress}%` }} />
      <span>{metrics.hydratedCount} / {metrics.totalBoundaries} components ready</span>
    </div>
  );
}
```

### Example 14: Deferred Hydration

```tsx
import { useDeferredHydration } from '@/lib/hydration';

function HeavyChart() {
  const { isHydrated, startHydration } = useDeferredHydration({
    defer: true,
    timeout: 5000,
  });

  if (!isHydrated) {
    return (
      <div className="chart-placeholder">
        <button onClick={startHydration}>Load Chart</button>
      </div>
    );
  }

  return <InteractiveChart data={chartData} />;
}
```

---

## Memory Management

### Example 15: Memory Pressure Response

```tsx
import { useMemoryPressure } from '@/lib/performance';

function MemoryAwareGallery({ images }) {
  const { level, usage } = useMemoryPressure();

  const displayCount = useMemo(() => {
    switch (level) {
      case 'critical': return 10;
      case 'warning': return 25;
      default: return images.length;
    }
  }, [level, images.length]);

  return (
    <div className="gallery">
      {images.slice(0, displayCount).map(img => (
        <Image key={img.id} src={img.url} />
      ))}
      {displayCount < images.length && (
        <p>Showing {displayCount} of {images.length} images (low memory)</p>
      )}
    </div>
  );
}
```

### Example 16: Memory-Aware Cache

```tsx
import { useMemoryAwareCache } from '@/lib/performance';

function DataProcessor() {
  const { cache, set, get } = useMemoryAwareCache({
    maxSize: 1000,
    maxMemory: 50 * 1024 * 1024, // 50MB
    adaptToMemoryPressure: true,
  });

  const processItem = (id: string) => {
    const cached = get(id);
    if (cached) return cached;

    const result = expensiveComputation(id);
    set(id, result);
    return result;
  };

  return <div>{/* ... */}</div>;
}
```

### Example 17: Resource Cleanup

```tsx
import { useMemoryCleanup } from '@/lib/performance';

function ResourceIntensiveComponent() {
  const { register, cleanup } = useMemoryCleanup();

  useEffect(() => {
    const largeData = fetchLargeDataset();
    register('largeData', () => {
      largeData.dispose();
    });

    return cleanup;
  }, []);

  return <div>{/* ... */}</div>;
}
```

---

## Network Optimization

### Example 18: Adaptive Image Quality

```tsx
import { useAdaptiveImageQuality } from '@/lib/performance';

function ResponsiveImage({ src, alt }) {
  const quality = useAdaptiveImageQuality();
  // quality = 'high' | 'medium' | 'low' | 'thumbnail'

  const imageSrc = useMemo(() => {
    const params = new URLSearchParams({ quality });
    return `${src}?${params}`;
  }, [src, quality]);

  return <img src={imageSrc} alt={alt} loading="lazy" />;
}
```

### Example 19: Network Status Indicator

```tsx
import { useNetworkStatusIndicator } from '@/lib/performance';

function NetworkBanner() {
  const { isOnline, quality, indicator } = useNetworkStatusIndicator();

  if (isOnline && quality === '4g') return null;

  return (
    <div className={`network-banner ${indicator}`}>
      {!isOnline && 'You are offline'}
      {isOnline && quality === 'slow-2g' && 'Very slow connection detected'}
      {isOnline && quality === '2g' && 'Slow connection - some features may be limited'}
    </div>
  );
}
```

### Example 20: Request Priority

```tsx
import { useRequestPerformance } from '@/lib/performance';

function DataFetcher() {
  const { prioritize, deprioritize } = useRequestPerformance();

  const fetchCritical = async () => {
    prioritize('/api/critical-data');
    const data = await fetch('/api/critical-data');
    deprioritize('/api/critical-data');
    return data;
  };

  return <button onClick={fetchCritical}>Fetch Critical Data</button>;
}
```

### Example 21: Preconnect to Origins

```tsx
import { usePreconnect } from '@/lib/performance';

function App() {
  // Preconnect to external origins
  usePreconnect([
    'https://api.example.com',
    'https://cdn.example.com',
    'https://fonts.googleapis.com',
  ]);

  return <MainApp />;
}
```

---

## Render Optimization

### Example 22: Render Profiler

```tsx
import { useRenderMetrics, withRenderTracking } from '@/lib/performance';

function ExpensiveComponent() {
  const { renderCount, avgRenderTime } = useRenderMetrics('ExpensiveComponent');

  useEffect(() => {
    if (renderCount > 50) {
      console.warn('ExpensiveComponent rendered 50+ times');
    }
  }, [renderCount]);

  return <div>{/* ... */}</div>;
}

// Or use HOC
const TrackedComponent = withRenderTracking(MyComponent, {
  name: 'MyComponent',
  warnThreshold: 16, // Warn if render > 16ms
});
```

### Example 23: Wasted Render Detection

```tsx
import { useWastedRenderDetector } from '@/lib/performance';

function OptimizedList({ items, config }) {
  const { wastedRenders, reason } = useWastedRenderDetector({
    propsToWatch: ['items', 'config'],
  });

  if (import.meta.env.DEV && wastedRenders > 5) {
    console.warn(`Wasted renders: ${wastedRenders}, reason: ${reason}`);
  }

  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}
```

### Example 24: Yield to Main Thread

```tsx
import { useYieldToMain, useDeferredRender } from '@/lib/performance';

function HeavyList({ items }) {
  const yieldToMain = useYieldToMain();

  const { rendered } = useDeferredRender({
    items,
    batchSize: 20,
    renderItem: async (item, index) => {
      if (index % 10 === 0) {
        await yieldToMain();
      }
      return <ListItem key={item.id} item={item} />;
    },
  });

  return <ul>{rendered}</ul>;
}
```

---

## Advanced Patterns

### Example 25: Performance-Aware Feature Loading

```tsx
import {
  usePerformanceBudget,
  useNetworkQuality,
  useMemoryPressure,
} from '@/lib/performance';

function AdaptiveFeature() {
  const budget = usePerformanceBudget();
  const network = useNetworkQuality();
  const memory = useMemoryPressure();

  const featureLevel = useMemo(() => {
    // Critical memory or network = minimal
    if (memory.level === 'critical' || network.quality === 'slow-2g') {
      return 'minimal';
    }

    // Budget exceeded or poor conditions = reduced
    if (!budget.isWithinBudget || memory.level === 'warning' || network.quality === '2g') {
      return 'reduced';
    }

    // All good = full
    return 'full';
  }, [budget, network, memory]);

  switch (featureLevel) {
    case 'minimal':
      return <MinimalFeature />;
    case 'reduced':
      return <ReducedFeature />;
    default:
      return <FullFeature />;
  }
}
```

### Example 26: Performance Observatory Dashboard

```tsx
import { PerformanceObservatory, PerformanceProvider } from '@/lib/performance';

function App() {
  return (
    <PerformanceProvider debug={import.meta.env.DEV}>
      <MainApp />

      {import.meta.env.DEV && (
        <PerformanceObservatory
          position="bottom-right"
          showVitals
          showMemory
          showNetwork
          showLongTasks
        />
      )}
    </PerformanceProvider>
  );
}
```

### Example 27: Custom Performance Reporter

```tsx
import { initPerformanceMonitoring } from '@/lib/performance';

initPerformanceMonitoring({
  onVitalMetric: (metric) => {
    // Send to custom analytics
    customAnalytics.sendMetric({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      sessionId: getSessionId(),
      page: location.pathname,
      userAgent: navigator.userAgent,
    });
  },

  onBudgetViolation: (violation) => {
    // Alert on budget violations
    monitoring.alert({
      type: 'performance',
      severity: violation.severity,
      message: `Budget exceeded: ${violation.metric}`,
    });
  },

  onLongTask: (task) => {
    // Track long tasks
    if (task.duration > 100) {
      monitoring.trackEvent('long-task', {
        duration: task.duration,
        attribution: task.attribution,
      });
    }
  },
});
```

### Example 28: Virtualized List with Performance Monitoring

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRenderMetrics } from '@/lib/performance';

function VirtualizedList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { renderCount } = useRenderMetrics('VirtualizedList');

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## See Also

- [Performance Guide](../PERFORMANCE.md) - Complete performance documentation
- [Architecture Guide](../ARCHITECTURE.md) - System design
- [Documentation Index](../INDEX.md) - All documentation resources
- [Routing Examples](./routing-examples.md) - Route prefetching examples
