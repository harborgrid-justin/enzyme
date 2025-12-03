# Performance Guide

> **Scope**: This document covers the Harbor React Library's performance monitoring and optimization features.
> For template-level performance configuration, see [Template Performance](../../../docs/PERFORMANCE.md).

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Web Vitals](#web-vitals)
- [Performance Monitoring](#performance-monitoring)
- [Predictive Prefetching](#predictive-prefetching)
- [Progressive Hydration](#progressive-hydration)
- [Performance Budgets](#performance-budgets)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)
- [Render Optimization](#render-optimization)
- [Performance Dashboard](#performance-dashboard)

---

## Overview

The performance system provides:

- **Core Web Vitals tracking** (LCP, INP, CLS, FCP, TTFB)
- **Long task detection** for main thread blocking
- **Memory pressure monitoring** with adaptive responses
- **Predictive prefetching** using ML-based navigation prediction
- **Progressive hydration** with priority-based scheduling
- **Performance budgets** with automatic degradation
- **Real-time performance dashboard**

### Performance Targets

| Metric | Good    | Needs Improvement | Poor    |
|--------|---------|-------------------|---------|
| LCP    | < 2.5s  | 2.5s - 4.0s       | > 4.0s  |
| INP    | < 200ms | 200ms - 500ms     | > 500ms |
| CLS    | < 0.1   | 0.1 - 0.25        | > 0.25  |
| FCP    | < 1.8s  | 1.8s - 3.0s       | > 3.0s  |
| TTFB   | < 800ms | 800ms - 1.8s      | > 1.8s  |

---

## Quick Start

```tsx
import {
  initPerformanceMonitoring,
  PerformanceProvider,
  usePerformanceBudget,
  usePredictivePrefetch,
} from '@/lib/performance';

// 1. Initialize monitoring at app startup
const cleanup = await initPerformanceMonitoring({
  debug: import.meta.env.DEV,
  reportToAnalytics: true,
  onVitalMetric: (metric) => {
    analytics.track('Web Vital', metric);
  },
  onBudgetViolation: (violation) => {
    console.warn('Budget exceeded:', violation);
  },
});

// 2. Wrap app with provider
function App() {
  return (
    <PerformanceProvider debug={import.meta.env.DEV}>
      <MainApp />
    </PerformanceProvider>
  );
}

// 3. Use performance hooks in components
function Dashboard() {
  const { isWithinBudget, degradedMode } = usePerformanceBudget();
  const prefetch = usePredictivePrefetch();

  return (
    <div>
      {degradedMode ? <LightweightDashboard /> : <FullDashboard />}

      <nav>
        <Link to="/reports" onMouseEnter={() => prefetch('/reports')}>
          Reports
        </Link>
      </nav>
    </div>
  );
}
```

---

## Web Vitals

### Automatic Collection

```tsx
import { initVitals, VitalsCollector } from '@/lib/performance';

// Initialize with callback
const cleanup = initVitals({
  debug: true,
  reportToAnalytics: true,
  sampleRate: 1.0, // Report all users
  onMetric: (metric) => {
    console.log(`${metric.name}: ${metric.value} (${metric.rating})`);
  },
});

// Or use the collector directly
const collector = new VitalsCollector({
  budgets: {
    LCP: 2500,
    INP: 200,
    CLS: 0.1,
  },
  onBudgetViolation: (violation) => {
    reportViolation(violation);
  },
});

collector.start();
```

### Hook-Based Vitals

```tsx
import { usePerformanceObservatory } from '@/lib/performance';

function PerformanceIndicator() {
  const { vitals, isLoading, overallScore } = usePerformanceObservatory();

  if (isLoading) return null;

  return (
    <div className="vitals-indicator">
      <span className={`score score-${overallScore >= 90 ? 'good' : 'poor'}`}>
        {overallScore}
      </span>

      <div className="metrics">
        <MetricDisplay name="LCP" value={vitals.LCP} unit="ms" />
        <MetricDisplay name="INP" value={vitals.INP} unit="ms" />
        <MetricDisplay name="CLS" value={vitals.CLS} unit="" />
      </div>
    </div>
  );
}
```

### Reporting Vitals

```tsx
import { getVitalsCollector } from '@/lib/performance';

// Get snapshot of all vitals
const collector = getVitalsCollector();
const snapshot = collector.getSnapshot();

// Report to analytics
analytics.track('Web Vitals', {
  LCP: snapshot.LCP?.value,
  INP: snapshot.INP?.value,
  CLS: snapshot.CLS?.value,
  FCP: snapshot.FCP?.value,
  TTFB: snapshot.TTFB?.value,
  page: window.location.pathname,
  connectionType: navigator.connection?.effectiveType,
});

// Report to custom endpoint
fetch('/api/metrics', {
  method: 'POST',
  body: JSON.stringify({
    vitals: snapshot,
    sessionId: getSessionId(),
    timestamp: Date.now(),
  }),
});
```

---

## Performance Monitoring

### Long Task Detection

```tsx
import { useLongTaskDetector } from '@/lib/performance';

function App() {
  const { longTasks, totalBlockingTime, isBlocking } = useLongTaskDetector({
    threshold: 50, // Tasks > 50ms
    onLongTask: (task) => {
      console.warn('Long task detected:', task.duration, 'ms');
    },
  });

  return (
    <div>
      {isBlocking && (
        <div className="blocking-indicator">
          UI may be slow...
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="debug-info">
          TBT: {totalBlockingTime}ms
          Long tasks: {longTasks.length}
        </div>
      )}

      <MainContent />
    </div>
  );
}
```

### Frame Rate Monitoring

```tsx
import { usePerformanceMonitor } from '@/lib/performance';

function AnimatedComponent() {
  const { fps, isJanky, metrics } = usePerformanceMonitor({
    trackFPS: true,
    trackMemory: true,
    sampleInterval: 1000,
  });

  // Reduce animation complexity when FPS drops
  const animationQuality = fps < 30 ? 'low' : fps < 50 ? 'medium' : 'high';

  return (
    <div>
      <Animation quality={animationQuality} />

      {import.meta.env.DEV && (
        <div className="fps-counter">
          {fps} FPS {isJanky && '(janky)'}
        </div>
      )}
    </div>
  );
}
```

### Render Performance

```tsx
import { useRenderMetrics, withRenderTracking } from '@/lib/performance';

// Hook-based tracking
function MyComponent() {
  const { renderCount, avgRenderTime, lastRenderTime } = useRenderMetrics();

  // Warn if component renders too often
  useEffect(() => {
    if (renderCount > 100) {
      console.warn('Component rendered 100+ times');
    }
  }, [renderCount]);

  return <div>{/* content */}</div>;
}

// HOC-based tracking
const TrackedComponent = withRenderTracking(MyComponent, {
  name: 'MyComponent',
  warnThreshold: 16, // Warn if render > 16ms
});
```

---

## Predictive Prefetching

### Automatic Prefetch on Hover

```tsx
import { PredictiveLink } from '@/lib/performance';

function Navigation() {
  return (
    <nav>
      {/* Prefetches route data when user hovers */}
      <PredictiveLink to="/dashboard">Dashboard</PredictiveLink>
      <PredictiveLink to="/reports">Reports</PredictiveLink>
      <PredictiveLink to="/settings">Settings</PredictiveLink>
    </nav>
  );
}
```

### ML-Based Prediction

```tsx
import { usePredictivePrefetch } from '@/lib/performance';

function SmartPrefetch() {
  const {
    predictNextRoute,
    prefetchPredicted,
    predictions,
    confidence,
  } = usePredictivePrefetch({
    enableLearning: true,
    confidenceThreshold: 0.7,
  });

  // Automatically prefetch high-confidence predictions
  useEffect(() => {
    const predicted = predictNextRoute(currentPath);

    if (predicted && predicted.confidence > 0.7) {
      prefetchPredicted(predicted.path);
    }
  }, [currentPath]);

  return null;
}
```

### Network-Aware Prefetching

```tsx
import { useNetworkQuality, usePredictivePrefetch } from '@/lib/performance';

function AdaptivePrefetch({ children }) {
  const { quality, isSlowConnection, dataSaver } = useNetworkQuality();
  const { prefetch } = usePredictivePrefetch();

  // Only prefetch on fast connections
  const shouldPrefetch = !isSlowConnection && !dataSaver;

  const handleMouseEnter = (to: string) => {
    if (shouldPrefetch) {
      prefetch(to);
    }
  };

  return React.Children.map(children, child => {
    if (React.isValidElement(child) && child.props.to) {
      return React.cloneElement(child, {
        onMouseEnter: () => handleMouseEnter(child.props.to),
      });
    }
    return child;
  });
}
```

---

## Progressive Hydration

### HydrationProvider Setup

```tsx
import { HydrationProvider } from '@/lib/hydration';

function App() {
  return (
    <HydrationProvider
      config={{
        debug: import.meta.env.DEV,
        collectMetrics: true,
        interactionStrategy: 'replay', // Capture & replay interactions
        budget: {
          frameTime: 50, // Max 50ms per frame
          idleTime: 10,  // Use 10ms of idle time
        },
      }}
    >
      <MainApp />
    </HydrationProvider>
  );
}
```

### Priority-Based Hydration

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function Page() {
  return (
    <div>
      {/* Critical - hydrate immediately */}
      <HydrationBoundary priority="critical" trigger="immediate">
        <Header />
        <HeroSection />
      </HydrationBoundary>

      {/* High - hydrate soon after critical */}
      <HydrationBoundary priority="high" trigger="immediate">
        <MainContent />
      </HydrationBoundary>

      {/* Normal - hydrate when visible */}
      <HydrationBoundary priority="normal" trigger="visible">
        <Sidebar />
      </HydrationBoundary>

      {/* Low - hydrate when idle */}
      <HydrationBoundary priority="low" trigger="idle">
        <RelatedContent />
      </HydrationBoundary>

      {/* Idle - hydrate in background */}
      <HydrationBoundary priority="idle" trigger="idle">
        <Footer />
        <Analytics />
      </HydrationBoundary>
    </div>
  );
}
```

### Hydration Monitoring

```tsx
import { useHydrationMetrics, useHydrationProgress } from '@/lib/hydration';

function HydrationDebugger() {
  const progress = useHydrationProgress();
  const metrics = useHydrationMetrics();

  return (
    <div className="hydration-debug">
      <div className="progress-bar" style={{ width: `${progress}%` }} />

      <dl>
        <dt>Hydrated</dt>
        <dd>{metrics.hydratedCount} / {metrics.totalBoundaries}</dd>

        <dt>Avg Duration</dt>
        <dd>{metrics.averageHydrationDuration.toFixed(2)}ms</dd>

        <dt>P95 Duration</dt>
        <dd>{metrics.p95HydrationDuration.toFixed(2)}ms</dd>

        <dt>Replayed Interactions</dt>
        <dd>{metrics.totalReplayedInteractions}</dd>
      </dl>
    </div>
  );
}
```

---

## Performance Budgets

### Budget Configuration

```tsx
import { PerformanceBudgetManager, getBudgetManager } from '@/lib/performance';

const budgetManager = getBudgetManager({
  budgets: {
    // Bundle budgets
    js: { max: 300 * 1024, warning: 250 * 1024 },       // 300KB JS
    css: { max: 50 * 1024, warning: 40 * 1024 },       // 50KB CSS
    images: { max: 500 * 1024, warning: 400 * 1024 },  // 500KB images

    // Runtime budgets
    firstPaint: { max: 1500, warning: 1000 },          // 1.5s FCP
    interactive: { max: 3500, warning: 3000 },         // 3.5s TTI
    longTasks: { max: 5, warning: 3 },                 // Max 5 long tasks

    // Per-interaction budgets
    responseTime: { max: 100, warning: 50 },           // 100ms response
  },

  onViolation: (violation) => {
    reportBudgetViolation(violation);
  },

  degradationStrategies: {
    js: 'defer-non-critical',
    images: 'reduce-quality',
    interactive: 'skeleton-first',
  },
});
```

### Budget-Aware Components

```tsx
import { usePerformanceBudget, useDegradedMode } from '@/lib/performance';

function Dashboard() {
  const {
    isWithinBudget,
    violations,
    currentUsage,
  } = usePerformanceBudget('interactive');

  const degraded = useDegradedMode();

  if (degraded) {
    return <LightweightDashboard />;
  }

  return (
    <div>
      {!isWithinBudget && (
        <PerformanceWarning violations={violations} />
      )}

      <FullDashboard />
    </div>
  );
}
```

### Conditional Feature Loading

```tsx
import { useBudgetConditional } from '@/lib/performance';

function FeatureRichComponent() {
  const { canLoad, reason } = useBudgetConditional({
    requiredBudget: {
      js: 50 * 1024,   // Needs 50KB JS headroom
      memory: 10,      // Needs 10MB memory headroom
    },
  });

  if (!canLoad) {
    return <SimplifiedComponent reason={reason} />;
  }

  return <FullFeatureComponent />;
}
```

---

## Memory Management

### Memory Monitoring

```tsx
import { useMemoryPressure, useMemoryCleanup } from '@/lib/performance';

function MemoryAwareComponent() {
  const { level, usage, trend } = useMemoryPressure();
  const cleanup = useMemoryCleanup();

  // Respond to memory pressure
  useEffect(() => {
    if (level === 'critical') {
      cleanup.clearCaches();
      cleanup.releaseResources();
    } else if (level === 'warning') {
      cleanup.reduceCacheSize();
    }
  }, [level]);

  return (
    <div>
      {level !== 'normal' && (
        <MemoryWarning level={level} />
      )}

      <Content cacheSize={level === 'normal' ? 'large' : 'small'} />
    </div>
  );
}
```

### Memory-Aware Caching

```tsx
import { useMemoryAwareCache } from '@/lib/performance';

function DataGrid({ data }) {
  const { cache, set, get, clear } = useMemoryAwareCache({
    maxSize: 1000,         // Max 1000 items
    maxMemory: 50 * 1024,  // Max 50KB
    evictionPolicy: 'lru', // Least recently used
    adaptToMemoryPressure: true,
  });

  // Cache automatically shrinks under memory pressure
  const getCachedItem = (id: string) => {
    const cached = get(id);
    if (cached) return cached;

    const item = computeExpensiveItem(id);
    set(id, item);
    return item;
  };

  return (
    <div className="data-grid">
      {data.map(row => (
        <Row key={row.id} data={getCachedItem(row.id)} />
      ))}
    </div>
  );
}
```

---

## Network Optimization

### Network Quality Hook

```tsx
import { useNetworkQuality } from '@/lib/performance';

function AdaptiveMedia() {
  const {
    quality,           // '4g' | '3g' | '2g' | 'slow-2g'
    effectiveType,
    downlink,          // Mbps
    rtt,               // ms
    saveData,          // User's data saver preference
    isSlowConnection,
    isOnline,
  } = useNetworkQuality();

  // Adapt content to network conditions
  const imageQuality = useMemo(() => {
    if (saveData || quality === 'slow-2g') return 'thumbnail';
    if (quality === '2g') return 'low';
    if (quality === '3g') return 'medium';
    return 'high';
  }, [quality, saveData]);

  return (
    <div>
      {!isOnline && <OfflineBanner />}

      <ImageGallery quality={imageQuality} />

      {quality === '4g' && <AutoplayVideo />}
    </div>
  );
}
```

### Adaptive Loading Strategy

```tsx
import { useAdaptiveLoading } from '@/lib/performance';

function ContentLoader() {
  const strategy = useAdaptiveLoading();

  // strategy = 'full' | 'reduced' | 'minimal' | 'offline'

  switch (strategy) {
    case 'full':
      return <FullContent autoplay prefetch />;
    case 'reduced':
      return <FullContent autoplay={false} prefetch={false} />;
    case 'minimal':
      return <MinimalContent />;
    case 'offline':
      return <OfflineContent />;
  }
}
```

---

## Render Optimization

### Wasted Render Detection

```tsx
import { useWastedRenderDetector } from '@/lib/performance';

function OptimizedComponent(props) {
  const { wastedRenders, lastRenderReason } = useWastedRenderDetector({
    propsToWatch: ['data', 'config'],
    onWastedRender: (reason) => {
      console.warn('Wasted render:', reason);
    },
  });

  if (import.meta.env.DEV && wastedRenders > 5) {
    console.warn('Component has many wasted renders');
  }

  return <div>{/* content */}</div>;
}
```

### Deferred Rendering

```tsx
import { useDeferredRender, useYieldToMain } from '@/lib/performance';

function HeavyList({ items }) {
  const yieldToMain = useYieldToMain();

  // Render items in batches, yielding to main thread
  const renderItem = async (item, index) => {
    if (index > 0 && index % 10 === 0) {
      await yieldToMain(); // Yield every 10 items
    }
    return <ListItem key={item.id} item={item} />;
  };

  const { rendered, isComplete } = useDeferredRender({
    items,
    renderItem,
    batchSize: 20,
    priority: 'user-visible',
  });

  return (
    <div>
      {rendered}
      {!isComplete && <LoadingMore />}
    </div>
  );
}
```

### Virtualization Integration

```tsx
import { useVirtualization } from '@/lib/performance';

function VirtualList({ items, itemHeight }) {
  const {
    virtualItems,
    totalHeight,
    scrollOffset,
    containerRef,
  } = useVirtualization({
    items,
    itemHeight,
    overscan: 5,
    getScrollElement: () => containerRef.current,
  });

  return (
    <div
      ref={containerRef}
      style={{ height: '400px', overflow: 'auto' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(virtualItem => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: itemHeight,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Performance Dashboard

### PerformanceObservatory Component

```tsx
import { PerformanceObservatory } from '@/lib/performance';

function App() {
  return (
    <div>
      <MainApp />

      {/* Development-only performance dashboard */}
      {import.meta.env.DEV && (
        <PerformanceObservatory
          position="bottom-right"
          expanded={false}
          showVitals
          showMemory
          showNetwork
          showLongTasks
          showRenderMetrics
        />
      )}
    </div>
  );
}
```

### Custom Dashboard

```tsx
import {
  usePerformanceObservatory,
  useNetworkQuality,
  useMemoryPressure,
} from '@/lib/performance';

function CustomPerformanceDashboard() {
  const perf = usePerformanceObservatory();
  const network = useNetworkQuality();
  const memory = useMemoryPressure();

  return (
    <div className="performance-dashboard">
      <section>
        <h3>Web Vitals</h3>
        <VitalCard name="LCP" value={perf.vitals.LCP} target={2500} />
        <VitalCard name="INP" value={perf.vitals.INP} target={200} />
        <VitalCard name="CLS" value={perf.vitals.CLS} target={0.1} />
      </section>

      <section>
        <h3>Network</h3>
        <Stat label="Type" value={network.quality} />
        <Stat label="RTT" value={`${network.rtt}ms`} />
        <Stat label="Downlink" value={`${network.downlink} Mbps`} />
      </section>

      <section>
        <h3>Memory</h3>
        <Stat label="Pressure" value={memory.level} />
        <Stat label="Usage" value={`${memory.usage}%`} />
        <MemoryChart data={memory.history} />
      </section>

      <section>
        <h3>Long Tasks</h3>
        <Stat label="Count" value={perf.longTasks.length} />
        <Stat label="Total Blocking" value={`${perf.totalBlockingTime}ms`} />
        <LongTaskList tasks={perf.longTasks} />
      </section>
    </div>
  );
}
```

---

## Best Practices

### 1. Measure First

```tsx
// Always measure before optimizing
const cleanup = initPerformanceMonitoring({
  onVitalMetric: (metric) => {
    // Collect baseline metrics
    baselineMetrics.push(metric);
  },
});

// After 1 week of data collection, analyze and optimize
```

### 2. Set Budgets Early

```tsx
// Define budgets at project start
const PERFORMANCE_BUDGETS = {
  js: 300 * 1024,      // 300KB
  css: 50 * 1024,      // 50KB
  images: 500 * 1024,  // 500KB
  lcp: 2500,           // 2.5s
  inp: 200,            // 200ms
};
```

### 3. Graceful Degradation

```tsx
// Always have fallbacks for slow devices
function Feature() {
  const { degradedMode } = usePerformanceBudget();

  return degradedMode ? <LiteFeature /> : <FullFeature />;
}
```

### 4. Progressive Enhancement

```tsx
// Start minimal, add features as budget allows
function Dashboard() {
  const { canLoad } = useBudgetConditional({ js: 50 * 1024 });

  return (
    <div>
      <CoreDashboard />
      {canLoad && <AdvancedWidgets />}
    </div>
  );
}
```

### 5. User-Centric Metrics

```tsx
// Focus on what users experience
const userMetrics = {
  timeToFirstInteraction: 'INP',
  visualStability: 'CLS',
  loadingExperience: 'LCP',
  responsiveness: 'responseTime',
};
```

---

## See Also

- [Performance Examples](./examples/performance-examples.md) - 25+ examples
- [Architecture Guide](./ARCHITECTURE.md) - System architecture
- [Documentation Index](./INDEX.md) - All documentation resources
- [Configuration Guide](./CONFIGURATION.md) - Performance configuration options
