# Hydration System

Progressive hydration system for optimal server-side rendering (SSR) performance with React 18+.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Components](#components)
- [Hooks](#hooks)
- [Configuration](#configuration)
- [SSR/SSG Patterns](#ssrssg-patterns)
- [Performance Optimization](#performance-optimization)
- [Examples](#examples)
- [Integration with Other Systems](#integration-with-other-systems)
- [Related Documentation](#related-documentation)

## Overview

The Hydration System provides progressive hydration capabilities to optimize initial page load and time-to-interactive (TTI) metrics. It allows you to prioritize which components hydrate first and defer non-critical components.

### Key Features

- **Progressive Hydration**: Prioritize above-the-fold content
- **Auto-Prioritized Scheduling**: 5-level priority queue system (critical → high → normal → low → idle)
- **Deferred Hydration**: Delay hydration of non-critical components
- **Interaction Replay**: Capture and replay user interactions during hydration
- **Priority Scheduling**: Control hydration order with priority levels
- **Automatic Scheduling**: Intelligent hydration based on idle time
- **Frame Budget Management**: Never blocks main thread > 50ms
- **Visibility-Based**: IntersectionObserver integration
- **Network-Aware**: Adapt to connection quality

### Performance Targets

- **INP**: < 100ms (interaction responsiveness)
- **TTI Reduction**: 40% improvement over full hydration
- **Frame Budget**: < 50ms per hydration task
- **Above-the-Fold**: < 500ms time to hydration

## Core Concepts

### Hydration Priority

Components can be hydrated with different priorities:

- `critical` - Hydrate immediately (above-the-fold content)
- `high` - Hydrate soon (interactive elements)
- `medium` - Hydrate when idle (default)
- `low` - Hydrate when very idle (below-the-fold)
- `idle` - Hydrate only when browser is completely idle

### Hydration Scheduling

```
┌─────────────────────────────────────────────────┐
│          Page Load & Hydration Flow             │
└─────────────────────────────────────────────────┘

1. HTML arrives from server
   │
   ├─> Static HTML is displayed (instant)
   │
2. Critical hydration (priority: critical/high)
   │
   ├─> Interactive above-the-fold content
   │
3. Deferred hydration (priority: medium/low/idle)
   │
   ├─> Below-the-fold and non-critical content
   │
4. All components hydrated
   │
   └─> Fully interactive page
```

### Interaction Replay

The system captures user interactions during hydration and replays them once components are interactive:

```tsx
// User clicks button before hydration completes
// ↓
// Interaction is captured
// ↓
// Component hydrates
// ↓
// Interaction is replayed
// ↓
// Button click handler executes
```

## Components

### HydrationProvider

Root provider for the hydration system.

```tsx
import { HydrationProvider } from '@missionfabric-js/enzyme/hydration';

function App() {
  return (
    <HydrationProvider
      config={{
        defaultPriority: 'medium',
        enableInteractionReplay: true,
        enableScheduling: true
      }}
    >
      <YourApp />
    </HydrationProvider>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `HydrationConfig` | See below | Hydration configuration |
| `children` | `ReactNode` | - | Child components |

#### HydrationConfig

```typescript
interface HydrationConfig {
  // Default priority for boundaries without explicit priority
  defaultPriority?: HydrationPriority;

  // Enable interaction capture and replay
  enableInteractionReplay?: boolean;

  // Enable automatic scheduling based on idle time
  enableScheduling?: boolean;

  // Custom scheduling strategy
  scheduler?: HydrationScheduler;

  // Debug mode
  debug?: boolean;
}
```

### HydrationBoundary

Wraps components to control their hydration behavior.

```tsx
import { HydrationBoundary } from '@missionfabric-js/enzyme/hydration';

function Page() {
  return (
    <>
      {/* Critical: Hydrate immediately */}
      <HydrationBoundary priority="critical">
        <Header />
      </HydrationBoundary>

      {/* High: Hydrate soon */}
      <HydrationBoundary priority="high">
        <HeroSection />
      </HydrationBoundary>

      {/* Low: Defer until idle */}
      <HydrationBoundary priority="low" defer>
        <Comments />
      </HydrationBoundary>
    </>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `priority` | `HydrationPriority` | `'medium'` | Hydration priority level |
| `defer` | `boolean` | `false` | Defer hydration until idle |
| `fallback` | `ReactNode` | `null` | Show while waiting to hydrate |
| `onHydrated` | `() => void` | - | Callback when hydrated |
| `replayInteractions` | `boolean` | `true` | Enable interaction replay |
| `children` | `ReactNode` | - | Content to hydrate |

## Hooks

### useHydration

Access hydration state and control.

```tsx
import { useHydration } from '@missionfabric-js/enzyme/hydration';

function MyComponent() {
  const {
    isHydrated,
    isHydrating,
    priority,
    scheduleHydration,
    cancelHydration
  } = useHydration();

  useEffect(() => {
    if (isHydrated) {
      console.log('Component is now interactive!');
    }
  }, [isHydrated]);

  return <div>Hydrated: {isHydrated ? 'Yes' : 'No'}</div>;
}
```

### useDeferredHydration

Defer hydration until a condition is met.

```tsx
import { useDeferredHydration } from '@missionfabric-js/enzyme/hydration';

function ExpensiveComponent() {
  const isHydrated = useDeferredHydration({
    // Hydrate when element is visible
    whenVisible: true,

    // Or when user interacts
    whenInteracted: true,

    // Or after a delay
    delay: 2000
  });

  if (!isHydrated) {
    return <StaticPlaceholder />;
  }

  return <InteractiveComponent />;
}
```

### useHydrationPriority

Dynamically adjust hydration priority.

```tsx
import { useHydrationPriority } from '@missionfabric-js/enzyme/hydration';

function AdaptiveComponent() {
  const { setPriority } = useHydrationPriority();

  useEffect(() => {
    // Increase priority if user scrolls to this component
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setPriority('high');
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [setPriority]);

  return <div ref={ref}>...</div>;
}
```

## Configuration

### Hydration Strategy

Choose a strategy based on your application needs:

#### 1. Aggressive (Fastest TTI)

```tsx
<HydrationProvider
  config={{
    defaultPriority: 'critical',
    enableScheduling: false
  }}
>
  <App />
</HydrationProvider>
```

- Hydrates everything immediately
- Best for small apps or when TTI is critical
- Higher initial JavaScript execution cost

#### 2. Balanced (Recommended)

```tsx
<HydrationProvider
  config={{
    defaultPriority: 'medium',
    enableScheduling: true,
    enableInteractionReplay: true
  }}
>
  <App />
</HydrationProvider>
```

- Prioritizes critical content
- Defers non-critical components
- Good balance between TTI and resource usage

#### 3. Conservative (Best Initial Performance)

```tsx
<HydrationProvider
  config={{
    defaultPriority: 'low',
    enableScheduling: true
  }}
>
  <App />
</HydrationProvider>
```

- Minimal initial hydration
- Defers most components
- Best for content-heavy sites
- May delay interactivity

## SSR/SSG Patterns

### Next.js Integration

```tsx
// pages/_app.tsx
import { HydrationProvider } from '@missionfabric-js/enzyme/hydration';

function MyApp({ Component, pageProps }) {
  return (
    <HydrationProvider>
      <Component {...pageProps} />
    </HydrationProvider>
  );
}

export default MyApp;
```

### React SSR (Express)

```tsx
// server.ts
import { renderToPipeableStream } from 'react-dom/server';
import { HydrationProvider } from '@missionfabric-js/enzyme/hydration';

app.get('/', (req, res) => {
  const { pipe } = renderToPipeableStream(
    <HydrationProvider>
      <App />
    </HydrationProvider>,
    {
      onShellReady() {
        res.setHeader('Content-Type', 'text/html');
        pipe(res);
      }
    }
  );
});
```

### Remix Integration

```tsx
// root.tsx
import { HydrationProvider } from '@missionfabric-js/enzyme/hydration';

export default function App() {
  return (
    <html>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <HydrationProvider>
          <Outlet />
        </HydrationProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

## Performance Optimization

### Measuring Impact

```tsx
import { useHydration } from '@missionfabric-js/enzyme/hydration';

function PerformanceMonitor() {
  const { isHydrated } = useHydration();

  useEffect(() => {
    if (isHydrated) {
      performance.measure('hydration-complete', 'navigationStart');
      const measure = performance.getEntriesByName('hydration-complete')[0];
      console.log('Hydration time:', measure.duration);
    }
  }, [isHydrated]);

  return null;
}
```

### Optimization Checklist

✅ **Prioritize Above-the-Fold**
```tsx
<HydrationBoundary priority="critical">
  <Hero />
</HydrationBoundary>
```

✅ **Defer Heavy Components**
```tsx
<HydrationBoundary priority="low" defer>
  <CommentSection /> {/* Lots of interactive elements */}
</HydrationBoundary>
```

✅ **Use Visibility-Based Hydration**
```tsx
function LazySection() {
  const isHydrated = useDeferredHydration({ whenVisible: true });
  return isHydrated ? <InteractiveContent /> : <StaticHTML />;
}
```

✅ **Enable Interaction Replay**
```tsx
<HydrationBoundary replayInteractions>
  <Form /> {/* User can interact before hydration */}
</HydrationBoundary>
```

## Examples

### E-commerce Product Page

```tsx
function ProductPage({ product }) {
  return (
    <HydrationProvider>
      {/* Critical: Product images and buy button */}
      <HydrationBoundary priority="critical">
        <ProductGallery images={product.images} />
        <BuyButton productId={product.id} />
      </HydrationBoundary>

      {/* High: Product details */}
      <HydrationBoundary priority="high">
        <ProductDetails {...product} />
      </HydrationBoundary>

      {/* Low: Reviews (below fold) */}
      <HydrationBoundary priority="low" defer>
        <Reviews productId={product.id} />
      </HydrationBoundary>

      {/* Idle: Related products */}
      <HydrationBoundary priority="idle" defer>
        <RelatedProducts category={product.category} />
      </HydrationBoundary>
    </HydrationProvider>
  );
}
```

### Blog Post

```tsx
function BlogPost({ post }) {
  return (
    <HydrationProvider>
      {/* Critical: Article content */}
      <HydrationBoundary priority="critical">
        <article>
          <h1>{post.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>
      </HydrationBoundary>

      {/* Medium: Social sharing */}
      <HydrationBoundary priority="medium">
        <SocialShare url={post.url} />
      </HydrationBoundary>

      {/* Low: Comments */}
      <HydrationBoundary priority="low" defer>
        <Comments postId={post.id} />
      </HydrationBoundary>

      {/* Idle: Related posts */}
      <HydrationBoundary priority="idle" defer>
        <RelatedPosts tags={post.tags} />
      </HydrationBoundary>
    </HydrationProvider>
  );
}
```

### Dashboard with Widgets

```tsx
function Dashboard() {
  return (
    <HydrationProvider
      config={{
        defaultPriority: 'medium',
        enableScheduling: true
      }}
    >
      {/* Critical: Navigation */}
      <HydrationBoundary priority="critical">
        <DashboardNav />
      </HydrationBoundary>

      <div className="grid">
        {/* High: Key metrics (always visible) */}
        <HydrationBoundary priority="high">
          <MetricsCard title="Revenue" />
          <MetricsCard title="Users" />
        </HydrationBoundary>

        {/* Medium: Charts (may require interaction) */}
        <HydrationBoundary priority="medium">
          <RevenueChart />
          <UserActivityChart />
        </HydrationBoundary>

        {/* Low: Tables (below fold) */}
        <HydrationBoundary priority="low" defer>
          <RecentOrdersTable />
        </HydrationBoundary>
      </div>
    </HydrationProvider>
  );
}
```

## Best Practices

1. **Measure First**: Use browser DevTools to identify slow hydration
2. **Prioritize Critical Path**: Hydrate above-the-fold content first
3. **Defer Heavy Components**: Comments, tables, and complex visualizations
4. **Use Interaction Replay**: For forms and interactive elements
5. **Test on Slow Devices**: Hydration impact is more visible on mobile
6. **Monitor Metrics**: Track TTI and hydration completion time

## Troubleshooting

### Components Not Hydrating

Check that:
- HydrationProvider wraps your app
- Priority is not set too low
- Browser supports requestIdleCallback (or polyfill is loaded)

### Interactions Not Working

Ensure:
- `replayInteractions` is enabled
- Component is within a HydrationBoundary
- Event handlers are properly attached

### Performance Not Improving

Verify:
- Using appropriate priority levels
- Heavy components are deferred
- Not hydrating too much content immediately

## Integration with Other Systems

### Performance Monitoring Integration

Track hydration performance with the performance monitoring system:

```tsx
import { HydrationProvider } from '@/lib/hydration';
import { PerformanceProvider, useHydrationMetrics } from '@/lib/performance';

function App() {
  return (
    <PerformanceProvider>
      <HydrationProvider>
        <YourApp />
        <HydrationPerformanceMonitor />
      </HydrationProvider>
    </PerformanceProvider>
  );
}

function HydrationPerformanceMonitor() {
  const { timeToFullHydration, hydratedCount } = useHydrationMetrics();

  useEffect(() => {
    if (timeToFullHydration) {
      analytics.track('Hydration Complete', {
        duration: timeToFullHydration,
        components: hydratedCount,
      });
    }
  }, [timeToFullHydration]);

  return null;
}
```

**Learn more:** [Performance Monitoring](../performance/MONITORING.md)

### Streaming Integration

Combine progressive hydration with HTML streaming:

```tsx
import { HydrationProvider } from '@/lib/hydration';
import { StreamBoundary } from '@/lib/streaming';

function Page() {
  return (
    <HydrationProvider>
      {/* Stream shell immediately */}
      <StreamBoundary priority="critical">
        <HydrationBoundary priority="critical">
          <Header />
        </HydrationBoundary>
      </StreamBoundary>

      {/* Stream and hydrate content progressively */}
      <StreamBoundary priority="high">
        <HydrationBoundary priority="normal" trigger="visible">
          <MainContent />
        </HydrationBoundary>
      </StreamBoundary>
    </HydrationProvider>
  );
}
```

**Learn more:** [Dynamic HTML Streaming](../STREAMING.md)

### VDOM Integration

Use modular DOM boundaries with progressive hydration:

```tsx
import { HydrationBoundary } from '@/lib/hydration';
import { ModuleBoundary } from '@/lib/vdom';

function ModularPage() {
  return (
    <div>
      {/* Each module boundary hydrates independently */}
      <ModuleBoundary id="header">
        <HydrationBoundary priority="critical">
          <Header />
        </HydrationBoundary>
      </ModuleBoundary>

      <ModuleBoundary id="content">
        <HydrationBoundary priority="normal" trigger="visible">
          <Content />
        </HydrationBoundary>
      </ModuleBoundary>
    </div>
  );
}
```

**Learn more:** [Virtual Modular DOM](../VDOM.md)

## Related Documentation

### Hydration System

- [Auto-Prioritized Strategies](./STRATEGIES.md) - Advanced hydration patterns and scheduling

### Performance System

- [Web Vitals](../performance/WEB_VITALS.md) - Core Web Vitals (LCP, INP, CLS)
- [Performance Monitoring](../performance/MONITORING.md) - Real-time monitoring and RUM
- [Performance Budgets](../performance/BUDGETS.md) - Budget enforcement
- [Performance Observatory](../performance/OBSERVATORY.md) - Performance dashboard

### Related Systems

- [Streaming Guide](../STREAMING.md) - Progressive HTML streaming
- [VDOM Guide](../VDOM.md) - Virtual modular DOM
- [Performance Guide](../PERFORMANCE.md) - Template-level performance
- [Advanced Features](../advanced/README.md) - Complete API documentation
