# Performance + Monitoring + Hydration Integration Guide

> **Harbor React Framework** - Comprehensive integration patterns for performance optimization, error monitoring, and progressive hydration.

## Table of Contents
- [Provider Composition](#provider-composition)
- [Error Boundaries + Hydration](#error-boundaries--hydration)
- [Performance During Hydration](#performance-during-hydration)
- [Crash Analytics](#crash-analytics)
- [Predictive Prefetching](#predictive-prefetching)
- [Memory Management](#memory-management)
- [Observable Patterns](#observable-patterns)
- [Anti-Patterns](#anti-patterns)

---

## Provider Composition

### Recommended Provider Stack

```
┌──────────────────────────────────────────────────────────────┐
│  GlobalErrorBoundary (catches all unhandled errors)          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  PerformanceObservatory (web vitals, metrics)          │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  HydrationProvider (progressive hydration)       │  │  │
│  │  │  ┌────────────────────────────────────────────┐  │  │  │
│  │  │  │  HierarchicalErrorBoundary (feature-level) │  │  │  │
│  │  │  │  ┌──────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  App Components                      │  │  │  │  │
│  │  │  │  └──────────────────────────────────────┘  │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### Example 1: Complete Provider Setup

```tsx
// app/providers.tsx
import { GlobalErrorBoundary, HierarchicalErrorBoundary } from '@/lib/monitoring';
import { PerformanceObservatory } from '@/lib/performance';
import { HydrationProvider } from '@/lib/hydration';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      fallback={<CriticalErrorPage />}
      onError={(error, info) => {
        crashAnalytics.report(error, { componentStack: info.componentStack });
      }}
    >
      <PerformanceObservatory
        reportEndpoint="/api/metrics"
        sampleRate={0.1}
        enableWebVitals
        enableMemoryPressure
      >
        <HydrationProvider
          strategy="progressive"
          priorityLevels={['critical', 'high', 'normal', 'low']}
          onHydrationComplete={(metrics) => {
            performance.mark('hydration-complete');
          }}
        >
          <HierarchicalErrorBoundary
            name="app-root"
            fallback={<AppErrorFallback />}
          >
            {children}
          </HierarchicalErrorBoundary>
        </HydrationProvider>
      </PerformanceObservatory>
    </GlobalErrorBoundary>
  );
}
```

---

## Error Boundaries + Hydration

### Example 2: Hydration-Aware Error Boundary

```tsx
import { ErrorBoundary } from '@/lib/monitoring';
import { useHydration, HydrationBoundary } from '@/lib/hydration';

export function HydrationSafeErrorBoundary({
  children,
  fallback,
  name
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  name: string;
}) {
  const { isHydrated, hydrationError } = useHydration();

  // Handle hydration errors differently
  if (hydrationError) {
    return (
      <div role="alert" aria-live="assertive">
        <h2>Content failed to load</h2>
        <button onClick={() => window.location.reload()}>
          Refresh page
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error) => {
        // Include hydration state in error context
        crashAnalytics.report(error, {
          component: name,
          hydrationState: isHydrated ? 'hydrated' : 'pending'
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Example 3: Progressive Error Recovery

```tsx
import { HierarchicalErrorBoundary } from '@/lib/monitoring';
import { HydrationBoundary } from '@/lib/hydration';

export function FeatureSection({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <HierarchicalErrorBoundary
      name={name}
      fallback={<FeatureErrorFallback name={name} />}
      onError={(error, errorInfo) => {
        // Log with feature context
        console.error(`Feature ${name} crashed:`, error);
      }}
    >
      <HydrationBoundary
        priority="normal"
        fallback={<FeatureSkeleton name={name} />}
      >
        {children}
      </HydrationBoundary>
    </HierarchicalErrorBoundary>
  );
}

// Usage: Features fail independently
export function Dashboard() {
  return (
    <div className="dashboard">
      <FeatureSection name="metrics">
        <MetricsWidget />
      </FeatureSection>

      <FeatureSection name="activity">
        <ActivityFeed />
      </FeatureSection>

      <FeatureSection name="notifications">
        <NotificationPanel />
      </FeatureSection>
    </div>
  );
}
```

### Example 4: Error Boundary with Hydration Retry

```tsx
import { useState, useCallback } from 'react';
import { ErrorBoundary } from '@/lib/monitoring';
import { useHydration } from '@/lib/hydration';

export function RetryableHydrationBoundary({
  children,
  maxRetries = 3
}: {
  children: React.ReactNode;
  maxRetries?: number;
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [key, setKey] = useState(0);
  const { rehydrate } = useHydration();

  const handleRetry = useCallback(async () => {
    if (retryCount < maxRetries) {
      setRetryCount((c) => c + 1);
      await rehydrate();
      setKey((k) => k + 1); // Force remount
    }
  }, [retryCount, maxRetries, rehydrate]);

  return (
    <ErrorBoundary
      key={key}
      fallback={
        <div>
          <p>Something went wrong</p>
          {retryCount < maxRetries ? (
            <button onClick={handleRetry}>
              Retry ({maxRetries - retryCount} attempts left)
            </button>
          ) : (
            <p>Please refresh the page</p>
          )}
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## Performance During Hydration

### Example 5: Hydration Performance Tracking

```tsx
import { usePerformanceMonitor } from '@/lib/performance';
import { useHydration, useHydrationMetrics } from '@/lib/hydration';
import { useEffect } from 'react';

export function HydrationPerformanceTracker() {
  const { trackMetric, startMeasure, endMeasure } = usePerformanceMonitor();
  const { isHydrating, hydrationProgress } = useHydration();
  const metrics = useHydrationMetrics();

  // Track hydration phases
  useEffect(() => {
    if (isHydrating) {
      startMeasure('hydration');
    } else {
      const duration = endMeasure('hydration');
      if (duration) {
        trackMetric('hydration-duration', duration);
        trackMetric('hydration-components', metrics.componentsHydrated);
        trackMetric('hydration-errors', metrics.errors);
      }
    }
  }, [isHydrating]);

  // Track progress milestones
  useEffect(() => {
    if (hydrationProgress >= 50 && hydrationProgress < 51) {
      performance.mark('hydration-50-percent');
    }
    if (hydrationProgress >= 90 && hydrationProgress < 91) {
      performance.mark('hydration-90-percent');
    }
  }, [hydrationProgress]);

  return null;
}
```

### Example 6: Deferred Hydration Based on Performance

```tsx
import { usePerformanceMonitor } from '@/lib/performance';
import { HydrationBoundary, useHydrationScheduler } from '@/lib/hydration';

export function PerformanceAwareHydration({
  children,
  name
}: {
  children: React.ReactNode;
  name: string;
}) {
  const { getCurrentFPS, getMemoryUsage } = usePerformanceMonitor();
  const scheduler = useHydrationScheduler();

  // Adjust hydration priority based on performance
  useEffect(() => {
    const fps = getCurrentFPS();
    const memory = getMemoryUsage();

    if (fps < 30 || memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
      // System under pressure - defer non-critical hydration
      scheduler.setPriority(name, 'low');
    } else if (fps > 55) {
      // Performance is good - speed up hydration
      scheduler.setPriority(name, 'high');
    }
  }, [getCurrentFPS, getMemoryUsage, name, scheduler]);

  return (
    <HydrationBoundary
      name={name}
      priority="normal"
      fallback={<Skeleton />}
    >
      {children}
    </HydrationBoundary>
  );
}
```

### Example 7: Web Vitals with Hydration Context

```tsx
import { VitalsCollector } from '@/lib/performance';
import { useHydration } from '@/lib/hydration';

export function EnhancedVitalsCollector() {
  const { isHydrated, hydrationDuration } = useHydration();

  return (
    <VitalsCollector
      onReport={(metric) => {
        // Enhance vitals with hydration context
        const enhancedMetric = {
          ...metric,
          hydrated: isHydrated,
          hydrationDuration,
          // Flag if metric was measured during hydration
          duringHydration: !isHydrated && metric.name !== 'TTFB'
        };

        // Send to analytics
        sendToAnalytics('web-vital', enhancedMetric);

        // Alert on poor LCP during hydration
        if (metric.name === 'LCP' && metric.value > 2500 && !isHydrated) {
          console.warn('Poor LCP during hydration - consider lazy loading');
        }
      }}
    />
  );
}
```

---

## Crash Analytics

### Example 8: Comprehensive Crash Context

```tsx
import { GlobalErrorBoundary, crashAnalytics } from '@/lib/monitoring';
import { usePerformanceMonitor } from '@/lib/performance';
import { useHydration } from '@/lib/hydration';

export function InstrumentedErrorBoundary({ children }: { children: React.ReactNode }) {
  const performance = usePerformanceMonitor();
  const hydration = useHydration();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    crashAnalytics.report(error, {
      // Component context
      componentStack: errorInfo.componentStack,

      // Performance context
      fps: performance.getCurrentFPS(),
      memory: performance.getMemoryUsage(),
      longTasks: performance.getLongTasks(),

      // Hydration context
      hydrationState: hydration.isHydrated ? 'complete' : 'pending',
      hydrationProgress: hydration.hydrationProgress,
      hydrationErrors: hydration.errors,

      // User context
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: (navigator as any).connection?.effectiveType,

      // Timing
      timestamp: Date.now(),
      sessionDuration: performance.now()
    });
  };

  return (
    <GlobalErrorBoundary onError={handleError} fallback={<CrashScreen />}>
      {children}
    </GlobalErrorBoundary>
  );
}
```

### Example 9: Breadcrumb Trail for Debugging

```tsx
import { useBreadcrumbs, ErrorBoundary } from '@/lib/monitoring';
import { useHydration } from '@/lib/hydration';
import { usePerformanceMonitor } from '@/lib/performance';

export function BreadcrumbInstrumentation({ children }: { children: React.ReactNode }) {
  const breadcrumbs = useBreadcrumbs();
  const { hydrationProgress } = useHydration();
  const { trackMetric } = usePerformanceMonitor();

  // Track hydration milestones
  useEffect(() => {
    if (hydrationProgress === 100) {
      breadcrumbs.add({
        category: 'hydration',
        message: 'Hydration complete',
        level: 'info'
      });
    }
  }, [hydrationProgress]);

  // Track performance events
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          breadcrumbs.add({
            category: 'performance',
            message: `Long task: ${entry.duration}ms`,
            level: 'warning',
            data: { duration: entry.duration }
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
```

### Example 10: Error Recovery with Performance Fallback

```tsx
import { ErrorBoundary, useErrorRecovery } from '@/lib/monitoring';
import { usePerformanceMonitor } from '@/lib/performance';

export function SmartErrorBoundary({ children }: { children: React.ReactNode }) {
  const { getMemoryUsage } = usePerformanceMonitor();
  const { canRecover, recover } = useErrorRecovery();

  const handleError = (error: Error) => {
    const memory = getMemoryUsage();

    // If memory is critical, suggest refresh instead of retry
    if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
      return {
        action: 'refresh',
        message: 'Memory pressure detected. Please refresh the page.'
      };
    }

    // Check if error is recoverable
    if (canRecover(error)) {
      return {
        action: 'retry',
        message: 'Something went wrong. Click to retry.'
      };
    }

    return {
      action: 'report',
      message: 'An unexpected error occurred.'
    };
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={({ error, resetErrorBoundary, recovery }) => (
        <div role="alert">
          <p>{recovery.message}</p>
          {recovery.action === 'retry' && (
            <button onClick={resetErrorBoundary}>Retry</button>
          )}
          {recovery.action === 'refresh' && (
            <button onClick={() => window.location.reload()}>Refresh</button>
          )}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## Predictive Prefetching

### Example 11: Prefetch with Error Handling

```tsx
import { PredictivePrefetchEngine } from '@/lib/performance';
import { useErrorReporter } from '@/lib/monitoring';

export function SafePrefetchEngine({ children }: { children: React.ReactNode }) {
  const reportError = useErrorReporter();

  return (
    <PredictivePrefetchEngine
      onPrefetchError={(url, error) => {
        // Report but don't crash - prefetch failures are non-critical
        reportError(error, {
          level: 'warning',
          category: 'prefetch',
          data: { url }
        });
      }}
      // Disable prefetch on poor connections
      shouldPrefetch={() => {
        const connection = (navigator as any).connection;
        return connection?.effectiveType !== 'slow-2g' &&
               connection?.effectiveType !== '2g';
      }}
      // Limit concurrent prefetches
      maxConcurrent={3}
    >
      {children}
    </PredictivePrefetchEngine>
  );
}
```

### Example 12: Hydration-Aware Prefetching

```tsx
import { usePrefetch } from '@/lib/performance';
import { useHydration } from '@/lib/hydration';

export function HydrationAwarePrefetch() {
  const { prefetch, cancelPrefetch } = usePrefetch();
  const { isHydrating, hydrationProgress } = useHydration();

  // Pause prefetching during critical hydration
  useEffect(() => {
    if (isHydrating && hydrationProgress < 80) {
      // Don't compete with hydration for resources
      cancelPrefetch('all');
    }
  }, [isHydrating, hydrationProgress]);

  // Resume prefetching after hydration
  useEffect(() => {
    if (!isHydrating) {
      // Prefetch likely next routes
      prefetch('/dashboard');
      prefetch('/settings');
    }
  }, [isHydrating]);

  return null;
}
```

---

## Memory Management

### Example 13: Memory-Aware Component Loading

```tsx
import { useMemoryPressure, formatBytes } from '@/lib/performance';
import { HydrationBoundary } from '@/lib/hydration';
import { ErrorBoundary } from '@/lib/monitoring';

export function MemoryAwareFeature({
  children,
  heavyFallback,
  name
}: {
  children: React.ReactNode;
  heavyFallback: React.ReactNode;
  name: string;
}) {
  const { pressure, usedMemory, limit } = useMemoryPressure();

  // Show lighter version under memory pressure
  if (pressure === 'critical') {
    console.warn(
      `Memory pressure critical (${formatBytes(usedMemory)}/${formatBytes(limit)}). ` +
      `Loading lightweight version of ${name}`
    );
    return <>{heavyFallback}</>;
  }

  return (
    <ErrorBoundary
      fallback={heavyFallback}
      onError={(error) => {
        // Check if error is memory-related
        if (error.message.includes('out of memory') ||
            error.message.includes('allocation')) {
          console.error(`Memory error in ${name}:`, formatBytes(usedMemory));
        }
      }}
    >
      <HydrationBoundary priority={pressure === 'high' ? 'low' : 'normal'}>
        {children}
      </HydrationBoundary>
    </ErrorBoundary>
  );
}
```

### Example 14: Graceful Degradation Chain

```tsx
import { useMemoryPressure } from '@/lib/performance';
import { useHydration } from '@/lib/hydration';
import { useErrorBoundary } from '@/lib/monitoring';

type QualityLevel = 'high' | 'medium' | 'low' | 'minimal';

export function useGracefulDegradation(): QualityLevel {
  const { pressure: memoryPressure } = useMemoryPressure();
  const { hydrationProgress } = useHydration();
  const { hasError } = useErrorBoundary();

  // Determine quality level based on system state
  if (hasError || memoryPressure === 'critical') {
    return 'minimal';
  }

  if (memoryPressure === 'high' || hydrationProgress < 50) {
    return 'low';
  }

  if (memoryPressure === 'moderate' || hydrationProgress < 80) {
    return 'medium';
  }

  return 'high';
}

// Usage
export function AdaptiveChart({ data }: { data: ChartData }) {
  const quality = useGracefulDegradation();

  switch (quality) {
    case 'minimal':
      return <SimpleTable data={data} />;
    case 'low':
      return <BasicChart data={data} animations={false} />;
    case 'medium':
      return <Chart data={data} animations={true} tooltips={false} />;
    case 'high':
      return <FullFeaturedChart data={data} />;
  }
}
```

---

## Observable Patterns

### Example 15: Performance → Error → Hydration Cascade

```tsx
/**
 * Observable cascade pattern:
 *
 *   Performance Observer
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │ Long Task    │──────► Pause Hydration
 *   │ Detected     │──────► Lower Priority
 *   └──────────────┘
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │ Memory       │──────► Trigger GC
 *   │ Pressure     │──────► Defer Components
 *   └──────────────┘
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │ Error        │──────► Report Context
 *   │ Boundary     │──────► Graceful Fallback
 *   └──────────────┘
 */

import { usePerformanceMonitor } from '@/lib/performance';
import { useHydrationScheduler } from '@/lib/hydration';
import { useErrorReporter } from '@/lib/monitoring';
import { useEffect } from 'react';

export function PerformanceCascadeObserver() {
  const perf = usePerformanceMonitor();
  const scheduler = useHydrationScheduler();
  const reporter = useErrorReporter();

  useEffect(() => {
    // Observe long tasks
    const taskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          // Pause hydration during long tasks
          scheduler.pause();

          // Resume after task completes
          setTimeout(() => scheduler.resume(), entry.duration);

          // Report if excessive
          if (entry.duration > 200) {
            reporter.warn('Long task detected', {
              duration: entry.duration,
              hydrationState: scheduler.getState()
            });
          }
        }
      }
    });

    taskObserver.observe({ entryTypes: ['longtask'] });
    return () => taskObserver.disconnect();
  }, [scheduler, reporter]);

  return null;
}
```

### Example 16: Unified Metrics Pipeline

```tsx
import { VitalsCollector, usePerformanceMonitor } from '@/lib/performance';
import { crashAnalytics, useBreadcrumbs } from '@/lib/monitoring';
import { useHydrationMetrics } from '@/lib/hydration';

export function UnifiedMetricsPipeline() {
  const perf = usePerformanceMonitor();
  const breadcrumbs = useBreadcrumbs();
  const hydrationMetrics = useHydrationMetrics();

  const handleMetric = useCallback((metric: Metric) => {
    // Unified metric object
    const unified = {
      name: metric.name,
      value: metric.value,
      timestamp: Date.now(),
      context: {
        fps: perf.getCurrentFPS(),
        memory: perf.getMemoryUsage(),
        hydration: {
          complete: hydrationMetrics.isComplete,
          duration: hydrationMetrics.duration,
          componentCount: hydrationMetrics.componentsHydrated
        },
        breadcrumbs: breadcrumbs.getRecent(10)
      }
    };

    // Route to appropriate destination
    if (metric.rating === 'poor') {
      crashAnalytics.reportMetric(unified, 'warning');
    } else {
      analytics.track('performance', unified);
    }

    // Add breadcrumb for debugging
    breadcrumbs.add({
      category: 'metric',
      message: `${metric.name}: ${metric.value}`,
      level: metric.rating === 'poor' ? 'warning' : 'info'
    });
  }, [perf, breadcrumbs, hydrationMetrics]);

  return <VitalsCollector onReport={handleMetric} />;
}
```

---

## Anti-Patterns

### Anti-Pattern 1: Error Boundary Inside Hydration Boundary

```tsx
// WRONG: Error boundary won't catch hydration errors
<HydrationBoundary>
  <ErrorBoundary>
    <Component />
  </ErrorBoundary>
</HydrationBoundary>

// CORRECT: Error boundary wraps hydration
<ErrorBoundary>
  <HydrationBoundary>
    <Component />
  </HydrationBoundary>
</ErrorBoundary>
```

### Anti-Pattern 2: Performance Tracking During Hydration

```tsx
// WRONG: Metrics are skewed during hydration
useEffect(() => {
  trackMetric('component-render-time', performance.now() - startTime);
}, []);

// CORRECT: Wait for hydration
const { isHydrated } = useHydration();
useEffect(() => {
  if (isHydrated) {
    trackMetric('component-render-time', performance.now() - startTime);
  }
}, [isHydrated]);
```

### Anti-Pattern 3: Blocking Hydration for Metrics

```tsx
// WRONG: Don't block hydration for non-critical metrics
await collectDetailedMetrics(); // Blocks main thread!
hydrateComponent();

// CORRECT: Collect metrics asynchronously
requestIdleCallback(() => collectDetailedMetrics());
hydrateComponent();
```

### Anti-Pattern 4: Missing Error Context

```tsx
// WRONG: Error without context is hard to debug
onError={(error) => {
  reportError(error);
}}

// CORRECT: Include all available context
onError={(error, errorInfo) => {
  reportError(error, {
    componentStack: errorInfo.componentStack,
    hydrationState: hydration.isHydrated,
    performanceMetrics: perf.getSnapshot(),
    breadcrumbs: breadcrumbs.getAll()
  });
}}
```

### Anti-Pattern 5: Hydration Without Error Recovery

```tsx
// WRONG: Hydration failure crashes the app
<HydrationBoundary>
  <CriticalComponent />
</HydrationBoundary>

// CORRECT: Provide fallback and recovery
<ErrorBoundary fallback={<FallbackUI />}>
  <HydrationBoundary
    fallback={<Skeleton />}
    onError={(e) => reportError(e)}
  >
    <CriticalComponent />
  </HydrationBoundary>
</ErrorBoundary>
```

---

## Performance Budgets

| Metric | Budget | Action if Exceeded |
|--------|--------|-------------------|
| LCP | < 2.5s | Defer non-critical hydration |
| FID | < 100ms | Reduce JS bundle, split code |
| CLS | < 0.1 | Reserve space for hydrated content |
| TTI | < 3.8s | Progressive hydration |
| Hydration | < 1s | Priority queue, lazy load |
| Memory | < 80% heap | Garbage collect, unload components |

---

## Timing Diagram

```
Page Load Timeline:
═══════════════════════════════════════════════════════════════►

TTFB          FCP           LCP        TTI      Fully Interactive
  │            │             │          │              │
  ▼            ▼             ▼          ▼              ▼
──┬────────────┬─────────────┬──────────┬──────────────┬──────►
  │            │             │          │              │
  │  HTML      │  Critical   │  Main    │  Hydration   │
  │  Parse     │  Hydration  │  Content │  Complete    │
  │            │             │          │              │
  │◄──────────►│◄───────────►│◄────────►│◄────────────►│
    ~200ms        ~500ms       ~800ms      ~500ms

Error Boundary Coverage:
├─────────────────── GlobalErrorBoundary ─────────────────────┤
              ├──── Feature Boundaries ────┤
                    ├── Component ──┤

Performance Monitoring:
├──── Web Vitals ────┤
        ├──────── Custom Metrics ─────────┤
                        ├── User Timing ──┤
```

## Related Documentation

### Integration Guides
- [README.md](./README.md) - Integration overview
- [FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md](./FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md) - Flags and error handling
- [REALTIME_QUERIES_SERVICES.md](./REALTIME_QUERIES_SERVICES.md) - Real-time data patterns

### Performance System
- [Performance](../performance/README.md) - Performance overview
- [Web Vitals](../performance/WEB_VITALS.md) - Core Web Vitals
- [Performance Monitoring](../performance/MONITORING.md) - Monitoring system
- [Performance Budgets](../performance/BUDGETS.md) - Budget enforcement
- [Lazy Loading](../performance/LAZY_LOADING.md) - Resource optimization
- [Prefetching](../performance/PREFETCHING.md) - Predictive prefetching
- [Render Tracking](../performance/RENDER_TRACKING.md) - Component tracking
- [Observatory](../performance/OBSERVATORY.md) - Performance dashboard

### Monitoring & Errors
- [Monitoring System](../monitoring/README.md) - Error and performance monitoring
- [Error Boundaries](../monitoring/ERROR_BOUNDARIES.md) - Error handling
- [Monitoring Types](../monitoring/TYPES.md) - Type definitions

### Hydration & State
- [Hydration System](../hydration/README.md) - Progressive hydration
- [Hydration Strategies](../hydration/STRATEGIES.md) - Hydration patterns
- [State System](../state/README.md) - State hydration
- [State Stores](../state/STORES.md) - Store patterns

### Routing & API
- [Routing](../routing/README.md) - Route-based code splitting
- [API Client](../api/README.md) - API performance patterns

---

*Last updated: 2024 | Harbor React Framework v2.0*
