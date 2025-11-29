# Streaming System

React 18 streaming SSR support for progressive content delivery and improved perceived performance.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Components](#components)
- [Configuration](#configuration)
- [Real-time Data Streams](#real-time-data-streams)
- [SSR Integration](#ssr-integration)
- [Examples](#examples)

## Overview

The Streaming System enables progressive HTML streaming for server-side rendering, allowing you to send content to the client as it becomes ready instead of waiting for the entire page to be generated.

### Key Features

- **Progressive Rendering**: Stream HTML chunks as they're ready
- **Suspense Integration**: Works seamlessly with React 18 Suspense
- **Streaming Boundaries**: Control what streams when
- **Fallback Management**: Show loading states while streaming
- **Chunk Optimization**: Intelligent chunk sizing and ordering

## Core Concepts

### HTML Streaming Flow

```
Server                          Network                      Client
──────                          ───────                      ──────

1. Start rendering              →  Shell HTML          →    Display shell
   │
2. Suspend on data fetch
   │ (show fallback)            →  Fallback HTML       →    Show skeleton
   │
3. Data arrives
   │
4. Resume rendering             →  Content chunk       →    Replace fallback
   │
5. More data arrives
   │
6. Complete rendering           →  Final chunks        →    Full page
```

### Streaming vs Traditional SSR

**Traditional SSR:**
```
Wait for ALL data → Render complete page → Send HTML → User sees page
                    (User waits...)
```

**Streaming SSR:**
```
Send shell → Show immediately
         ↓
Send chunks as ready → Progressive display
                    ↓
Complete → Fully interactive
```

## Components

### StreamProvider

Root provider for streaming configuration.

```tsx
import { StreamProvider } from '@missionfabric-js/enzyme/streaming';

function App() {
  return (
    <StreamProvider
      config={{
        chunkSize: 'auto',
        prioritizeAboveFold: true,
        enableProgressiveHydration: true
      }}
    >
      <YourApp />
    </StreamProvider>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `StreamConfig` | See below | Streaming configuration |
| `children` | `ReactNode` | - | Child components |

#### StreamConfig

```typescript
interface StreamConfig {
  // Chunk size strategy
  chunkSize?: 'auto' | 'small' | 'medium' | 'large' | number;

  // Prioritize above-the-fold content
  prioritizeAboveFold?: boolean;

  // Enable progressive hydration
  enableProgressiveHydration?: boolean;

  // Custom streaming handler
  streamHandler?: StreamHandler;

  // Debug mode
  debug?: boolean;
}
```

### StreamBoundary

Defines boundaries for streaming chunks.

```tsx
import { StreamBoundary } from '@missionfabric-js/enzyme/streaming';
import { Suspense } from 'react';

function Page() {
  return (
    <>
      {/* This streams first */}
      <StreamBoundary priority="high" fallback={<HeaderSkeleton />}>
        <Header />
      </StreamBoundary>

      {/* This streams when data is ready */}
      <Suspense fallback={<ContentSkeleton />}>
        <StreamBoundary priority="normal">
          <AsyncContent />
        </StreamBoundary>
      </Suspense>

      {/* This streams last */}
      <StreamBoundary priority="low" fallback={<FooterSkeleton />}>
        <Footer />
      </StreamBoundary>
    </>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `priority` | `'high' \| 'normal' \| 'low'` | `'normal'` | Streaming priority |
| `fallback` | `ReactNode` | `null` | Loading fallback |
| `name` | `string` | - | Boundary identifier |
| `onStream` | `() => void` | - | Called when streaming |
| `children` | `ReactNode` | - | Content to stream |

## Configuration

### Chunk Strategies

#### Auto (Recommended)

```tsx
<StreamProvider config={{ chunkSize: 'auto' }}>
  <App />
</StreamProvider>
```

Automatically determines optimal chunk size based on:
- Content complexity
- Network conditions
- Device capabilities

#### Fixed Size

```tsx
<StreamProvider config={{ chunkSize: 'medium' }}>
  <App />
</StreamProvider>
```

- `small`: 1-2KB chunks (slow connections)
- `medium`: 5-10KB chunks (default)
- `large`: 20-50KB chunks (fast connections)

#### Custom Size

```tsx
<StreamProvider config={{ chunkSize: 8192 }}>
  <App />
</StreamProvider>
```

Specify exact chunk size in bytes.

## Real-time Data Streams

The Streaming System integrates with the Realtime module for live data streaming.

### Server-Sent Events (SSE)

```tsx
import { useStreamSubscription } from '@missionfabric-js/enzyme/streaming';

function LiveMetrics() {
  const { data, isStreaming } = useStreamSubscription('/api/metrics');

  return (
    <div>
      <div>Streaming: {isStreaming ? 'Yes' : 'No'}</div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

### WebSocket Streams

```tsx
import { StreamBoundary } from '@missionfabric-js/enzyme/streaming';
import { RealtimeProvider } from '@missionfabric-js/enzyme/realtime';

function LiveDashboard() {
  return (
    <RealtimeProvider config={{ type: 'websocket' }}>
      <StreamBoundary priority="high">
        <LiveDataComponent channel="metrics" />
      </StreamBoundary>
    </RealtimeProvider>
  );
}
```

## SSR Integration

### Next.js App Router

```tsx
// app/layout.tsx
import { StreamProvider } from '@missionfabric-js/enzyme/streaming';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <StreamProvider>
          {children}
        </StreamProvider>
      </body>
    </html>
  );
}

// app/page.tsx
import { StreamBoundary } from '@missionfabric-js/enzyme/streaming';
import { Suspense } from 'react';

export default async function Page() {
  return (
    <>
      {/* Shell: Streams immediately */}
      <StreamBoundary priority="high">
        <Header />
      </StreamBoundary>

      {/* Content: Streams when ready */}
      <Suspense fallback={<Skeleton />}>
        <StreamBoundary>
          <AsyncData />
        </StreamBoundary>
      </Suspense>
    </>
  );
}
```

### React 18 SSR (Express)

```tsx
// server.ts
import { renderToPipeableStream } from 'react-dom/server';
import { StreamProvider } from '@missionfabric-js/enzyme/streaming';

app.get('/', (req, res) => {
  const { pipe, abort } = renderToPipeableStream(
    <StreamProvider>
      <App />
    </StreamProvider>,
    {
      bootstrapScripts: ['/client.js'],
      onShellReady() {
        res.setHeader('Content-Type', 'text/html');
        pipe(res);
      },
      onShellError(error) {
        console.error('Shell error:', error);
        res.status(500).send('<!doctype html><p>Error</p>');
      },
      onAllReady() {
        console.log('All content ready');
      },
      onError(error) {
        console.error('Stream error:', error);
      }
    }
  );

  // Timeout after 5 seconds
  setTimeout(() => abort(), 5000);
});
```

### Remix

```tsx
// app/root.tsx
import { StreamProvider } from '@missionfabric-js/enzyme/streaming';

export default function App() {
  return (
    <html>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <StreamProvider
          config={{
            chunkSize: 'auto',
            prioritizeAboveFold: true
          }}
        >
          <Outlet />
        </StreamProvider>
        <Scripts />
      </body>
    </html>
  );
}

// app/routes/index.tsx
import { StreamBoundary } from '@missionfabric-js/enzyme/streaming';
import { Suspense } from 'react';
import { defer } from '@remix-run/node';
import { Await, useLoaderData } from '@remix-run/react';

export async function loader() {
  return defer({
    criticalData: await getCriticalData(),
    deferredData: getDeferredData(), // Promise
  });
}

export default function Index() {
  const { criticalData, deferredData } = useLoaderData<typeof loader>();

  return (
    <>
      {/* Shell with critical data */}
      <StreamBoundary priority="high">
        <Header data={criticalData} />
      </StreamBoundary>

      {/* Deferred content */}
      <Suspense fallback={<ContentSkeleton />}>
        <Await resolve={deferredData}>
          {(data) => (
            <StreamBoundary>
              <Content data={data} />
            </StreamBoundary>
          )}
        </Await>
      </Suspense>
    </>
  );
}
```

## Examples

### News Article Page

```tsx
import { StreamProvider, StreamBoundary } from '@missionfabric-js/enzyme/streaming';
import { Suspense } from 'react';

function ArticlePage({ slug }) {
  return (
    <StreamProvider>
      {/* Stream 1: Header (immediate) */}
      <StreamBoundary priority="high">
        <SiteHeader />
      </StreamBoundary>

      {/* Stream 2: Article content (when ready) */}
      <Suspense fallback={<ArticleSkeleton />}>
        <StreamBoundary name="article">
          <Article slug={slug} />
        </StreamBoundary>
      </Suspense>

      {/* Stream 3: Related articles (low priority) */}
      <Suspense fallback={<RelatedSkeleton />}>
        <StreamBoundary priority="low" name="related">
          <RelatedArticles category={slug} />
        </StreamBoundary>
      </Suspense>

      {/* Stream 4: Comments (very low priority) */}
      <Suspense fallback={<CommentsSkeleton />}>
        <StreamBoundary priority="low" name="comments">
          <Comments articleId={slug} />
        </StreamBoundary>
      </Suspense>
    </StreamProvider>
  );
}
```

### E-commerce Product Listing

```tsx
import { StreamProvider, StreamBoundary } from '@missionfabric-js/enzyme/streaming';
import { Suspense } from 'react';

function ProductListing({ category }) {
  return (
    <StreamProvider config={{ chunkSize: 'medium' }}>
      {/* Immediate: Shell */}
      <StreamBoundary priority="high">
        <Header />
        <CategoryBreadcrumbs category={category} />
      </StreamBoundary>

      {/* High priority: First page of products */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <StreamBoundary priority="high" name="products">
          <ProductGrid category={category} page={1} />
        </StreamBoundary>
      </Suspense>

      {/* Normal priority: Filters */}
      <Suspense fallback={<FiltersSkeleton />}>
        <StreamBoundary name="filters">
          <ProductFilters category={category} />
        </StreamBoundary>
      </Suspense>

      {/* Low priority: Recommendations */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <StreamBoundary priority="low" name="recommendations">
          <RecommendedProducts category={category} />
        </StreamBoundary>
      </Suspense>
    </StreamProvider>
  );
}
```

### Dashboard with Real-time Updates

```tsx
import { StreamProvider, StreamBoundary } from '@missionfabric-js/enzyme/streaming';
import { RealtimeProvider } from '@missionfabric-js/enzyme/realtime';
import { Suspense } from 'react';

function Dashboard() {
  return (
    <StreamProvider>
      <RealtimeProvider config={{ type: 'websocket', url: '/ws' }}>
        {/* Shell */}
        <StreamBoundary priority="high">
          <DashboardHeader />
        </StreamBoundary>

        {/* Key metrics (high priority, real-time) */}
        <Suspense fallback={<MetricsSkeleton />}>
          <StreamBoundary priority="high" name="metrics">
            <LiveMetrics channel="dashboard.metrics" />
          </StreamBoundary>
        </Suspense>

        {/* Charts (normal priority, real-time) */}
        <Suspense fallback={<ChartsSkeleton />}>
          <StreamBoundary name="charts">
            <LiveCharts channel="dashboard.charts" />
          </StreamBoundary>
        </Suspense>

        {/* Activity feed (low priority, real-time) */}
        <Suspense fallback={<ActivitySkeleton />}>
          <StreamBoundary priority="low" name="activity">
            <LiveActivityFeed channel="dashboard.activity" />
          </StreamBoundary>
        </Suspense>
      </RealtimeProvider>
    </StreamProvider>
  );
}
```

## Performance Optimization

### Measuring Streaming Performance

```tsx
import { useEffect } from 'react';

function PerformanceMonitor() {
  useEffect(() => {
    // Measure time to first byte (TTFB)
    const navTiming = performance.getEntriesByType('navigation')[0];
    console.log('TTFB:', navTiming.responseStart - navTiming.requestStart);

    // Measure streaming chunks
    const resourceTiming = performance.getEntriesByType('resource');
    console.log('Resource timing:', resourceTiming);

    // Measure paint timing
    const paintTiming = performance.getEntriesByType('paint');
    console.log('First paint:', paintTiming[0]?.startTime);
    console.log('First contentful paint:', paintTiming[1]?.startTime);
  }, []);

  return null;
}
```

### Optimization Strategies

#### 1. Shell Optimization

Keep the initial shell small and fast:

```tsx
<StreamBoundary priority="high">
  {/* Minimal, static content only */}
  <header>
    <Logo />
    <Navigation links={staticLinks} />
  </header>
</StreamBoundary>
```

#### 2. Progressive Loading

Stream in order of importance:

```tsx
// 1. Critical shell
<StreamBoundary priority="high">
  <Shell />
</StreamBoundary>

// 2. Above-the-fold content
<StreamBoundary priority="high">
  <AboveFold />
</StreamBoundary>

// 3. Interactive elements
<StreamBoundary priority="normal">
  <InteractiveContent />
</StreamBoundary>

// 4. Below-the-fold content
<StreamBoundary priority="low">
  <BelowFold />
</StreamBoundary>
```

#### 3. Fallback Optimization

Use lightweight skeleton screens:

```tsx
function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded mt-2" />
      <div className="h-4 bg-gray-200 rounded mt-2 w-2/3" />
    </div>
  );
}
```

## Best Practices

1. **Start with Shell**: Send minimal HTML shell immediately
2. **Prioritize Critical Content**: Stream above-the-fold first
3. **Use Suspense Boundaries**: Wrap async components
4. **Optimize Fallbacks**: Keep skeleton screens lightweight
5. **Monitor Metrics**: Track TTFB, FCP, LCP
6. **Test on Slow Networks**: Streaming benefits are more visible on slow connections

## Troubleshooting

### Content Not Streaming

Check that:
- Using React 18+ with streaming-capable renderer
- StreamProvider wraps your app
- Using Suspense boundaries correctly
- Server supports HTTP/2 or chunked transfer encoding

### Hydration Errors

Ensure:
- Server and client render the same content
- Using proper key attributes
- Async data is properly handled
- Suspense boundaries are correctly placed

### Performance Not Improving

Verify:
- Shell is small and fast
- Not blocking on slow data fetches in shell
- Using appropriate chunk sizes
- Monitoring the right metrics (TTFB, FCP)

## API Reference

See the [Advanced Features Overview](../advanced/README.md) for complete API documentation.
