# Performance Guide

> **Performance optimization for Harbor React** - Core Web Vitals monitoring, optimization strategies, and best practices for building fast applications.

---

## Table of Contents

1. [Performance Overview](#performance-overview)
2. [Core Web Vitals](#core-web-vitals)
3. [Performance Observatory](#performance-observatory)
4. [Predictive Prefetching](#predictive-prefetching)
5. [Bundle Optimization](#bundle-optimization)
6. [Rendering Optimization](#rendering-optimization)
7. [Data Loading Optimization](#data-loading-optimization)
8. [Memory Management](#memory-management)
9. [Monitoring & Profiling](#monitoring--profiling)
10. [Performance Checklist](#performance-checklist)

---

## Performance Overview

### Performance Targets

| Metric | Target | Good | Needs Improvement | Poor |
|--------|--------|------|-------------------|------|
| LCP | < 2.0s | < 2.5s | 2.5s - 4.0s | > 4.0s |
| INP | < 100ms | < 200ms | 200ms - 500ms | > 500ms |
| CLS | < 0.05 | < 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP | < 1.5s | < 1.8s | 1.8s - 3.0s | > 3.0s |
| TTFB | < 600ms | < 800ms | 800ms - 1800ms | > 1800ms |
| Bundle Size | < 150KB | < 200KB | 200KB - 350KB | > 350KB |

### Performance Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE OPTIMIZATION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BUILD TIME                        RUNTIME                               │
│  ┌──────────────────┐             ┌──────────────────┐                  │
│  │ Code Splitting   │             │ Streaming HTML   │                  │
│  │ Tree Shaking     │             │ Selective Hydrate│                  │
│  │ Minification     │             │ Virtual DOM Mod  │                  │
│  │ Asset Optimize   │             │ Prefetching      │                  │
│  └──────────────────┘             └──────────────────┘                  │
│                                                                          │
│  MONITORING                        OPTIMIZATION                          │
│  ┌──────────────────┐             ┌──────────────────┐                  │
│  │ Performance Obs  │             │ Memoization      │                  │
│  │ Core Web Vitals  │             │ Lazy Loading     │                  │
│  │ Error Tracking   │             │ Caching          │                  │
│  │ Analytics        │             │ Compression      │                  │
│  └──────────────────┘             └──────────────────┘                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Web Vitals

### Understanding the Metrics

#### LCP (Largest Contentful Paint)

Measures loading performance - when the largest content element becomes visible.

```typescript
// Good: Optimize LCP elements
<img
  src={heroImage}
  fetchPriority="high"
  loading="eager"
  decoding="async"
  alt="Hero"
/>

// Bad: Lazy load LCP elements
<img
  src={heroImage}
  loading="lazy" // DON'T lazy load LCP images
  alt="Hero"
/>
```

#### INP (Interaction to Next Paint)

Measures responsiveness - time from user interaction to visual feedback.

```typescript
// Good: Non-blocking updates
const handleClick = () => {
  // Update UI immediately
  setIsLoading(true);

  // Defer expensive work
  startTransition(() => {
    performExpensiveOperation();
  });
};

// Bad: Blocking main thread
const handleClick = () => {
  performExpensiveOperation(); // Blocks until complete
  setIsLoading(false);
};
```

#### CLS (Cumulative Layout Shift)

Measures visual stability - unexpected layout shifts.

```typescript
// Good: Reserve space for dynamic content
<div style={{ aspectRatio: '16/9' }}>
  <img src={image} alt="" />
</div>

// Bad: No dimensions on images
<img src={image} alt="" /> // Causes layout shift when loaded
```

### Monitoring Core Web Vitals

```typescript
import { initPerformanceMonitoring, VitalsCollector } from '@/lib/performance';

// Initialize monitoring
const cleanup = await initPerformanceMonitoring({
  debug: import.meta.env.DEV,
  reportToAnalytics: import.meta.env.PROD,
  onVitalMetric: (metric) => {
    console.log(`${metric.name}: ${metric.value}`);
  },
});

// Get current metrics
const collector = VitalsCollector.getInstance();
const snapshot = collector.getSnapshot();
// {
//   LCP: { value: 1850, rating: 'good' },
//   INP: { value: 85, rating: 'good' },
//   CLS: { value: 0.02, rating: 'good' },
//   FCP: { value: 1200, rating: 'good' },
//   TTFB: { value: 450, rating: 'good' },
// }
```

---

## Performance Observatory

### Built-in Dashboard

```tsx
import { PerformanceObservatory, PerformanceProvider } from '@/lib/performance';

function App() {
  return (
    <PerformanceProvider>
      <AppContent />

      {/* Show performance dashboard in development */}
      {import.meta.env.DEV && (
        <PerformanceObservatory
          position="bottom-right"
          initiallyOpen={false}
          showResourceTiming
          showLongTasks
        />
      )}
    </PerformanceProvider>
  );
}
```

### Observatory Features

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE OBSERVATORY                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Core Web Vitals                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LCP: 1.85s (Good)  │  INP: 85ms (Good)  │  CLS: 0.02 (Good)    │   │
│  │  FCP: 1.2s (Good)   │  TTFB: 450ms (Good)                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Resource Timing                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Scripts: 145KB (12 files)                                       │   │
│  │  Styles: 25KB (3 files)                                          │   │
│  │  Images: 250KB (8 files)                                         │   │
│  │  Fonts: 80KB (2 files)                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Long Tasks                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [12:30:45] 85ms - React render                                  │   │
│  │  [12:30:46] 120ms - Data processing                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Using Performance Context

```tsx
import { usePerformanceObservatory } from '@/lib/performance';

function PerformanceAwareComponent() {
  const { metrics, resourceStats, longTasks } = usePerformanceObservatory();

  // Adapt based on performance
  const shouldReduceMotion = metrics.INP?.value > 200;
  const shouldLazyLoad = resourceStats.totalSize > 500000;

  return (
    <div>
      {shouldReduceMotion ? (
        <StaticContent />
      ) : (
        <AnimatedContent />
      )}
    </div>
  );
}
```

---

## Predictive Prefetching

### How It Works

Harbor React uses AI-driven navigation prediction:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PREDICTIVE PREFETCHING                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. LEARN                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  User navigates: Home → Products → Product Detail                │   │
│  │  System learns: After Products, users often visit Product Detail │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  2. PREDICT                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  User on Products page                                           │   │
│  │  Prediction: 80% likely to visit Product Detail next            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  3. PREFETCH                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Prefetch Product Detail chunk                                   │   │
│  │  Preload Product Detail data                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  4. INSTANT NAVIGATION                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  User clicks Product → Instant load (already prefetched)        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Using Predictive Prefetch

```tsx
import { usePredictivePrefetch, PredictiveLink } from '@/lib/performance';

function Navigation() {
  const { predictions, prefetchRoute } = usePredictivePrefetch({
    confidenceThreshold: 0.7,
    maxPrefetches: 3,
    enableLearning: true,
  });

  return (
    <nav>
      {/* PredictiveLink automatically prefetches based on predictions */}
      <PredictiveLink to="/products">Products</PredictiveLink>
      <PredictiveLink to="/dashboard">Dashboard</PredictiveLink>

      {/* Or manually prefetch */}
      <button
        onMouseEnter={() => prefetchRoute('/products/featured')}
      >
        Featured Products
      </button>
    </nav>
  );
}
```

### Configuration

```typescript
import { getPredictivePrefetchEngine } from '@/lib/performance';

const engine = getPredictivePrefetchEngine({
  // Minimum confidence to prefetch
  confidenceThreshold: 0.7,

  // Maximum concurrent prefetches
  maxPrefetches: 3,

  // Enable pattern learning
  enableLearning: true,

  // Prefetch on idle only
  prefetchOnIdle: true,

  // Respect user's data saver preference
  respectDataSaver: true,

  // Debug logging
  debug: import.meta.env.DEV,
});
```

---

## Bundle Optimization

### Code Splitting

```typescript
// Route-level code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// Component-level code splitting
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// Named exports splitting
const { DataGrid } = await import('./components/DataGrid');
```

### Dynamic Imports

```typescript
// Import on interaction
const handleExport = async () => {
  const { exportToExcel } = await import('@/lib/utils/export');
  exportToExcel(data);
};

// Import on visibility
useEffect(() => {
  if (isIntersecting) {
    import('./HeavyComponent').then(({ HeavyComponent }) => {
      setComponent(() => HeavyComponent);
    });
  }
}, [isIntersecting]);
```

### Tree Shaking

```typescript
// Good: Named imports (tree-shakeable)
import { Button, Input } from '@/lib/ui';

// Bad: Namespace import (not tree-shakeable)
import * as UI from '@/lib/ui';
```

### Bundle Analysis

```bash
# Analyze bundle
npm run build -- --analyze

# Or use Vite's built-in
npx vite-bundle-visualizer
```

---

## Rendering Optimization

### Memoization

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize components
const ExpensiveList = memo(function ExpensiveList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

// Memoize computed values
function Dashboard({ data }) {
  const processedData = useMemo(
    () => expensiveProcessing(data),
    [data]
  );

  return <Chart data={processedData} />;
}

// Memoize callbacks
function Form({ onSubmit }) {
  const handleSubmit = useCallback(
    (data) => onSubmit(data),
    [onSubmit]
  );

  return <FormComponent onSubmit={handleSubmit} />;
}
```

### Virtualization

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Concurrent Features

```tsx
import { useTransition, useDeferredValue, Suspense } from 'react';

function SearchResults({ query }) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  const handleSearch = (newQuery) => {
    // Mark state update as non-urgent
    startTransition(() => {
      setResults(search(newQuery));
    });
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isPending ? <Spinner /> : <Results data={results} />}
    </div>
  );
}

// Defer expensive computations
function DataTable({ data }) {
  const deferredData = useDeferredValue(data);
  const isStale = data !== deferredData;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <ExpensiveTable data={deferredData} />
    </div>
  );
}
```

---

## Data Loading Optimization

### Query Optimization

```typescript
import { useQuery, useQueries } from '@tanstack/react-query';

// Parallel queries
const results = useQueries({
  queries: [
    { queryKey: ['users'], queryFn: fetchUsers },
    { queryKey: ['products'], queryFn: fetchProducts },
    { queryKey: ['orders'], queryFn: fetchOrders },
  ],
});

// Dependent queries
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});

const { data: orders } = useQuery({
  queryKey: ['orders', user?.id],
  queryFn: () => fetchUserOrders(user.id),
  enabled: !!user?.id, // Only fetch when user is loaded
});
```

### Prefetching Data

```typescript
import { useQueryClient } from '@tanstack/react-query';

function ProductList() {
  const queryClient = useQueryClient();

  const handleHover = (productId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['product', productId],
      queryFn: () => fetchProduct(productId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return (
    <ul>
      {products.map(product => (
        <li
          key={product.id}
          onMouseEnter={() => handleHover(product.id)}
        >
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </li>
      ))}
    </ul>
  );
}
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot previous value
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update
    queryClient.setQueryData(['todos'], (old) =>
      old.map(todo =>
        todo.id === newTodo.id ? { ...todo, ...newTodo } : todo
      )
    );

    return { previousTodos };
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

---

## Memory Management

### Cleanup Patterns

```tsx
import { useResourceCleanup } from '@/lib/hooks';

function HeavyComponent() {
  const { registerCleanup } = useResourceCleanup();

  useEffect(() => {
    const subscription = dataStream.subscribe(handleData);
    const timer = setInterval(pollData, 5000);

    // Register cleanup
    registerCleanup('subscription', () => subscription.unsubscribe());
    registerCleanup('timer', () => clearInterval(timer));

    return () => {
      // All registered cleanups run automatically
    };
  }, []);

  return <DataDisplay />;
}
```

### Memory Monitoring

```typescript
import { usePerformanceMonitor } from '@/lib/hooks';

function App() {
  const metrics = usePerformanceMonitor({
    trackMemory: true,
    warnThreshold: 100 * 1024 * 1024, // 100MB
  });

  useEffect(() => {
    if (metrics.memoryUsage > metrics.warnThreshold) {
      console.warn('High memory usage detected');
      // Trigger cleanup
    }
  }, [metrics.memoryUsage]);

  return <AppContent />;
}
```

---

## Monitoring & Profiling

### Performance Hook

```typescript
import { usePerformanceMonitor } from '@/lib/hooks';

function CriticalComponent() {
  const { startMeasure, endMeasure, getMetrics } = usePerformanceMonitor();

  const handleExpensiveOperation = async () => {
    startMeasure('expensive-operation');
    await performExpensiveOperation();
    endMeasure('expensive-operation');

    const metrics = getMetrics();
    if (metrics['expensive-operation'] > 100) {
      console.warn('Operation took too long');
    }
  };

  return <button onClick={handleExpensiveOperation}>Run</button>;
}
```

### React Profiler

```tsx
import { Profiler } from 'react';

function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  if (actualDuration > 16) {
    console.warn(`Slow render: ${id} took ${actualDuration}ms`);
  }
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <AppContent />
    </Profiler>
  );
}
```

---

## Performance Checklist

### Initial Load

- [ ] Bundle size < 150KB (gzipped)
- [ ] LCP < 2.5s
- [ ] FCP < 1.8s
- [ ] TTFB < 800ms
- [ ] Critical CSS inlined
- [ ] Above-fold images preloaded
- [ ] Fonts preloaded

### Runtime

- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] No layout shifts
- [ ] Long tasks < 50ms
- [ ] Smooth 60fps animations
- [ ] Memory leaks prevented

### Code

- [ ] Code splitting implemented
- [ ] Tree shaking enabled
- [ ] Dynamic imports for heavy deps
- [ ] Memoization for expensive ops
- [ ] Virtualization for long lists

### Data

- [ ] Query caching configured
- [ ] Prefetching implemented
- [ ] Optimistic updates where possible
- [ ] Pagination/infinite scroll
- [ ] Request deduplication

### Assets

- [ ] Images optimized (WebP/AVIF)
- [ ] Images lazy loaded (below fold)
- [ ] Fonts optimized (subset)
- [ ] Compression enabled (gzip/brotli)

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Streaming Guide](./STREAMING.md) - HTML streaming implementation
- [Hydration Guide](./HYDRATION.md) - Selective hydration system
- [Configuration Guide](./CONFIGURATION.md) - Application configuration
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Testing Guide](./TESTING.md) - Testing strategies

---

<p align="center">
  <strong>Performance Optimization</strong><br>
  Fast by default, optimized by design
</p>
