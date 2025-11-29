# Auto-Prioritized Hydration Strategies

> Advanced hydration patterns with automatic priority scheduling, interaction replay, and performance optimization.

## Table of Contents

- [Overview](#overview)
- [Priority System](#priority-system)
- [Trigger Strategies](#trigger-strategies)
- [Scheduling Patterns](#scheduling-patterns)
- [Interaction Replay](#interaction-replay)
- [Visibility-Based Hydration](#visibility-based-hydration)
- [Network-Aware Hydration](#network-aware-hydration)
- [Performance Optimization](#performance-optimization)
- [Advanced Patterns](#advanced-patterns)

## Overview

Enzyme's auto-prioritized hydration system intelligently schedules component hydration based on priority, visibility, and user interactions to minimize Time to Interactive (TTI) and achieve exceptional INP scores.

### Key Benefits

- **40% TTI Reduction**: Progressive hydration vs. full hydration
- **< 100ms INP**: Optimal interaction responsiveness
- **< 500ms Above-the-Fold**: Critical content hydrates fast
- **< 50ms Frame Budget**: Never blocks main thread
- **Zero Configuration**: Smart defaults with full customization

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│          Auto-Prioritized Hydration Flow                │
└─────────────────────────────────────────────────────────┘

1. Page Loads (SSR/SSG HTML visible immediately)
   │
   ├─> Priority Queue Created
   │   ├─ Critical (priority: 5)
   │   ├─ High (priority: 4)
   │   ├─ Normal (priority: 3)
   │   ├─ Low (priority: 2)
   │   └─ Idle (priority: 1)
   │
2. Hydration Scheduler Starts
   │
   ├─> Immediate: Critical & High (< 100ms)
   ├─> Visible: Normal when in viewport
   ├─> Interaction: On user interaction
   └─> Idle: When browser is idle
   │
3. Interaction Replay
   │
   └─> Captured events replayed after hydration
```

## Priority System

### Priority Levels

```typescript
type HydrationPriority =
  | 'critical'  // P5: Hydrate immediately (< 100ms)
  | 'high'      // P4: Hydrate soon (< 500ms)
  | 'normal'    // P3: Hydrate when visible
  | 'low'       // P2: Defer until idle
  | 'idle';     // P1: Background hydration

// Priority queue processes highest priority first
```

### Critical Priority

**Use for:**
- Above-the-fold hero sections
- Navigation and header
- Primary call-to-action buttons
- Essential interactive elements

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function Page() {
  return (
    <HydrationBoundary priority="critical" trigger="immediate" aboveTheFold>
      <Hero />
      <PrimaryCTA />
    </HydrationBoundary>
  );
}
```

### High Priority

**Use for:**
- Main content area
- Important forms
- Key navigation elements
- Interactive widgets above fold

```tsx
<HydrationBoundary priority="high" trigger="immediate">
  <MainContent />
  <SearchForm />
</HydrationBoundary>
```

### Normal Priority

**Use for:**
- Secondary content
- Sidebars
- Below-the-fold interactive elements
- Standard components

```tsx
<HydrationBoundary priority="normal" trigger="visible">
  <Sidebar />
  <SecondaryContent />
</HydrationBoundary>
```

### Low Priority

**Use for:**
- Comments sections
- Related content
- Analytics widgets
- Non-essential features

```tsx
<HydrationBoundary priority="low" trigger="idle">
  <Comments />
  <RelatedArticles />
</HydrationBoundary>
```

### Idle Priority

**Use for:**
- Footer content
- Chat widgets
- Social feeds
- Marketing pixels

```tsx
<HydrationBoundary priority="idle" trigger="idle">
  <Footer />
  <ChatWidget />
  <SocialFeed />
</HydrationBoundary>
```

## Trigger Strategies

### Immediate Trigger

Hydrate as soon as possible:

```tsx
<HydrationBoundary trigger="immediate" priority="critical">
  <CriticalComponent />
</HydrationBoundary>
```

### Visible Trigger

Hydrate when element enters viewport:

```tsx
<HydrationBoundary
  trigger="visible"
  priority="normal"
  visibilityThreshold={0.1} // 10% visible
  rootMargin="50px"         // Start 50px before visible
>
  <LazyComponent />
</HydrationBoundary>
```

### Interaction Trigger

Hydrate on user interaction:

```tsx
<HydrationBoundary
  trigger="interaction"
  priority="normal"
  interactionEvents={['click', 'focus', 'mouseenter']}
  captureInteractions // Replay interactions after hydration
>
  <InteractiveForm />
</HydrationBoundary>
```

### Idle Trigger

Hydrate during browser idle time:

```tsx
<HydrationBoundary
  trigger="idle"
  priority="low"
  timeout={5000}  // Max 5s wait
  idleDeadline={50} // Use up to 50ms of idle time
>
  <NonCriticalComponent />
</HydrationBoundary>
```

### Custom Trigger

Hydrate based on custom logic:

```tsx
<HydrationBoundary
  trigger="custom"
  shouldHydrate={(context) => {
    // Custom logic
    return context.scrollDepth > 50 && context.timeOnPage > 3000;
  }}
>
  <ConditionalComponent />
</HydrationBoundary>
```

## Scheduling Patterns

### Blog Post Pattern

```tsx
function BlogPost({ post }) {
  return (
    <HydrationProvider>
      {/* Critical: Article content (immediate) */}
      <HydrationBoundary priority="critical" trigger="immediate" aboveTheFold>
        <article>
          <h1>{post.title}</h1>
          <PostContent content={post.content} />
        </article>
      </HydrationBoundary>

      {/* High: Author info (immediate) */}
      <HydrationBoundary priority="high" trigger="immediate">
        <AuthorBio author={post.author} />
      </HydrationBoundary>

      {/* Normal: Social sharing (visible) */}
      <HydrationBoundary priority="normal" trigger="visible">
        <SocialShare post={post} />
      </HydrationBoundary>

      {/* Low: Comments (interaction or idle) */}
      <HydrationBoundary
        priority="low"
        trigger="interaction"
        interactionEvents={['click', 'focus']}
      >
        <Comments postId={post.id} />
      </HydrationBoundary>

      {/* Idle: Related posts (idle) */}
      <HydrationBoundary priority="idle" trigger="idle">
        <RelatedPosts category={post.category} />
      </HydrationBoundary>
    </HydrationProvider>
  );
}
```

### E-commerce Product Page

```tsx
function ProductPage({ product }) {
  return (
    <HydrationProvider>
      {/* Critical: Product gallery & buy button */}
      <HydrationBoundary priority="critical" trigger="immediate" aboveTheFold>
        <ProductGallery images={product.images} />
        <BuyButton product={product} />
        <PriceDisplay price={product.price} />
      </HydrationBoundary>

      {/* High: Product details */}
      <HydrationBoundary priority="high" trigger="immediate">
        <ProductDetails details={product.details} />
        <SizeSelector sizes={product.sizes} />
        <QuantitySelector />
      </HydrationBoundary>

      {/* Normal: Reviews (visible) */}
      <HydrationBoundary priority="normal" trigger="visible">
        <ProductReviews productId={product.id} />
      </HydrationBoundary>

      {/* Low: Q&A (interaction) */}
      <HydrationBoundary
        priority="low"
        trigger="interaction"
        interactionEvents={['click']}
      >
        <QuestionsAndAnswers productId={product.id} />
      </HydrationBoundary>

      {/* Idle: Recommendations */}
      <HydrationBoundary priority="idle" trigger="idle">
        <RecommendedProducts category={product.category} />
        <RecentlyViewed />
      </HydrationBoundary>
    </HydrationProvider>
  );
}
```

### Dashboard Pattern

```tsx
function Dashboard() {
  return (
    <HydrationProvider>
      {/* Critical: Navigation */}
      <HydrationBoundary priority="critical" trigger="immediate">
        <DashboardNav />
      </HydrationBoundary>

      {/* High: Key metrics (always visible) */}
      <HydrationBoundary priority="high" trigger="immediate">
        <MetricsGrid>
          <MetricCard title="Revenue" />
          <MetricCard title="Users" />
          <MetricCard title="Conversion" />
        </MetricsGrid>
      </HydrationBoundary>

      {/* Normal: Charts (visible) */}
      <HydrationBoundary priority="normal" trigger="visible">
        <ChartsSection>
          <RevenueChart />
          <UserActivityChart />
        </ChartsSection>
      </HydrationBoundary>

      {/* Low: Data tables (visible or interaction) */}
      <HydrationBoundary
        priority="low"
        trigger="visible"
        visibilityThreshold={0.5}
      >
        <DataTable />
      </HydrationBoundary>

      {/* Idle: Notifications & alerts */}
      <HydrationBoundary priority="idle" trigger="idle">
        <NotificationCenter />
        <ActivityFeed />
      </HydrationBoundary>
    </HydrationProvider>
  );
}
```

## Interaction Replay

### How It Works

Interaction replay captures user interactions before hydration completes and replays them afterward:

```
User clicks button (not yet hydrated)
  ↓
Event captured & queued
  ↓
Component hydrates
  ↓
Event replayed on hydrated component
  ↓
Handler executes normally
```

### Enabling Interaction Replay

```tsx
<HydrationBoundary
  trigger="visible"
  captureInteractions
  replayTimeout={5000} // Max 5s to hydrate before discarding
>
  <InteractiveForm />
</HydrationBoundary>
```

### Supported Events

```typescript
const replayableEvents = [
  'click',
  'submit',
  'input',
  'change',
  'focus',
  'blur',
  'keydown',
  'keyup',
];
```

### Custom Replay Logic

```tsx
import { useInteractionReplay } from '@/lib/hydration';

function CustomComponent() {
  const { captureEvent, replayEvents, clearQueue } = useInteractionReplay();

  useEffect(() => {
    // Custom capture logic
    const handleInteraction = (e) => {
      if (shouldCapture(e)) {
        captureEvent(e);
      }
    };

    // After hydration, replay
    replayEvents((event) => {
      // Custom replay logic
      processEvent(event);
    });

    return clearQueue;
  }, []);
}
```

## Visibility-Based Hydration

### IntersectionObserver Integration

```tsx
<HydrationBoundary
  trigger="visible"
  observerOptions={{
    root: null,              // viewport
    rootMargin: '50px',      // Start 50px before visible
    threshold: 0.1,          // 10% visible triggers
  }}
>
  <Component />
</HydrationBoundary>
```

### Progressive Visibility

```tsx
function Page() {
  return (
    <>
      {/* Hydrate immediately when any part is visible */}
      <HydrationBoundary trigger="visible" visibilityThreshold={0.01}>
        <Header />
      </HydrationBoundary>

      {/* Hydrate when 50% visible */}
      <HydrationBoundary trigger="visible" visibilityThreshold={0.5}>
        <MainContent />
      </HydrationBoundary>

      {/* Hydrate when fully visible */}
      <HydrationBoundary trigger="visible" visibilityThreshold={1.0}>
        <Footer />
      </HydrationBoundary>
    </>
  );
}
```

## Network-Aware Hydration

### Adaptive Hydration

```tsx
import { useNetworkQuality } from '@/lib/performance';
import { HydrationBoundary } from '@/lib/hydration';

function AdaptiveComponent() {
  const { effectiveType, saveData } = useNetworkQuality();

  // Adjust priority based on network
  const priority = effectiveType === '4g' && !saveData
    ? 'high'
    : effectiveType === '3g'
    ? 'normal'
    : 'low';

  return (
    <HydrationBoundary priority={priority}>
      <ExpensiveComponent />
    </HydrationBoundary>
  );
}
```

### Data Saver Mode

```tsx
import { useDataSaver } from '@/lib/performance';

function DataSaverAware() {
  const { enabled, strategy } = useDataSaver();

  if (enabled) {
    return (
      <HydrationBoundary priority="low" trigger="interaction">
        <HeavyComponent />
      </HydrationBoundary>
    );
  }

  return (
    <HydrationBoundary priority="high" trigger="immediate">
      <HeavyComponent />
    </HydrationBoundary>
  );
}
```

## Performance Optimization

### Frame Budget Management

The hydration scheduler respects frame budgets to prevent blocking:

```typescript
const scheduler = new HydrationScheduler({
  budget: {
    maxTaskDuration: 50,  // Max 50ms per task
    maxIdleTime: 50,      // Use up to 50ms idle time
    targetFPS: 60,        // Maintain 60fps
  },
});
```

### Chunked Hydration

For large components, hydrate in chunks:

```tsx
<HydrationBoundary
  priority="normal"
  chunkSize={5}  // Hydrate 5 children at a time
  chunkDelay={16} // Wait 16ms between chunks
>
  <LargeList>
    {items.map(item => <Item key={item.id} {...item} />)}
  </LargeList>
</HydrationBoundary>
```

### Deferred State Hydration

```tsx
import { useDeferredHydration } from '@/lib/hydration';

function StatefulComponent() {
  const { isHydrated } = useDeferredHydration({
    delay: 100,
    priority: 'low',
  });

  const [state, setState] = useState(() => {
    // Only initialize expensive state after hydration
    return isHydrated ? initializeExpensiveState() : {};
  });

  return <Component state={state} />;
}
```

### Monitoring Hydration Performance

```tsx
import { useHydrationMetrics } from '@/lib/hydration';

function HydrationMonitor() {
  const {
    totalBoundaries,
    hydratedCount,
    hydrationProgress,
    averageHydrationDuration,
    p95HydrationDuration,
    timeToFullHydration,
  } = useHydrationMetrics();

  return (
    <div className="hydration-metrics">
      <div>Progress: {hydrationProgress.toFixed(0)}%</div>
      <div>Hydrated: {hydratedCount}/{totalBoundaries}</div>
      <div>Avg Duration: {averageHydrationDuration.toFixed(2)}ms</div>
      <div>P95 Duration: {p95HydrationDuration.toFixed(2)}ms</div>
      <div>Time to Full: {timeToFullHydration}ms</div>
    </div>
  );
}
```

## Advanced Patterns

### Conditional Hydration

```tsx
import { useConditionalHydration } from '@/lib/hydration';

function SmartComponent() {
  const shouldHydrate = useConditionalHydration({
    // Only hydrate if user has scrolled
    scrollDepth: 25, // % of page

    // And spent time on page
    timeOnPage: 3000, // 3 seconds

    // And has fast connection
    networkSpeed: '3g', // minimum

    // Or if user interacts
    onInteraction: true,
  });

  if (!shouldHydrate) {
    return <StaticHTML />;
  }

  return <InteractiveComponent />;
}
```

### Partial Hydration

```tsx
<HydrationBoundary
  partial
  hydrateOnly={['button', 'form']} // Only hydrate specific elements
>
  <ComplexComponent>
    <StaticContent />
    <button>Interactive</button>
    <form>Interactive</form>
    <MoreStaticContent />
  </ComplexComponent>
</HydrationBoundary>
```

### Islands Architecture

```tsx
function Page() {
  return (
    <div>
      {/* Static shell */}
      <Header />
      <nav>Static Navigation</nav>

      {/* Island 1: Interactive search */}
      <HydrationBoundary priority="high">
        <SearchWidget />
      </HydrationBoundary>

      {/* Static content */}
      <article>
        <h1>Article Title</h1>
        <p>Static content...</p>
      </article>

      {/* Island 2: Comments */}
      <HydrationBoundary priority="low" trigger="visible">
        <Comments />
      </HydrationBoundary>

      {/* Static footer */}
      <Footer />
    </div>
  );
}
```

### Progressive Enhancement

```tsx
function EnhancedComponent() {
  const [isEnhanced, setIsEnhanced] = useState(false);

  useDeferredHydration({
    onHydrated: () => setIsEnhanced(true),
  });

  return (
    <div>
      {/* Basic functionality (works without JS) */}
      <BasicForm action="/submit" method="POST">
        <input name="email" type="email" required />
        <button type="submit">Subscribe</button>
      </BasicForm>

      {/* Enhanced functionality (after hydration) */}
      {isEnhanced && (
        <>
          <ValidationMessages />
          <AutoComplete />
          <RealTimePreview />
        </>
      )}
    </div>
  );
}
```

## Related Documentation

- [Hydration System](./README.md) - Core hydration concepts
- [Web Vitals](../performance/WEB_VITALS.md) - Performance metrics
- [Performance Monitoring](../performance/MONITORING.md) - Real-time monitoring
- [Streaming Guide](../STREAMING.md) - Progressive HTML streaming
- [VDOM Guide](../VDOM.md) - Virtual modular DOM
- [Performance Guide](../PERFORMANCE.md) - Template performance

---

**Last Updated:** 2025-11-29
**Version:** 1.0.0
