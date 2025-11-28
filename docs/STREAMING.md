# Dynamic HTML Streaming Guide

> **Progressive HTML streaming with React 18** - Reduce Time to First Byte (TTFB) and improve perceived performance through chunked transfer encoding and Suspense boundaries.

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Configuration](#configuration)
4. [Stream Boundaries](#stream-boundaries)
5. [Priority Levels](#priority-levels)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### The Problem

Traditional React rendering blocks until the entire component tree is ready:

```
┌──────────────────────────────────────────────────────────────────┐
│                    TRADITIONAL RENDERING                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Request ─────────────────────────────────────────────▶           │
│                                                                    │
│  [════════════ Wait for entire tree ════════════]                 │
│                                                                    │
│                                                    ◀───── Response │
│  [Blank screen for user]                                          │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Problems:**
- Large apps suffer from Time to First Byte (TTFB) delays
- Users see blank screens during initial load
- Heavy components block the entire page

### The Solution

Harbor React implements progressive HTML streaming:

```
┌──────────────────────────────────────────────────────────────────┐
│                    STREAMING RENDERING                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Request ─▶                                                       │
│                                                                    │
│  [Shell] ◀─ Immediate (header, nav, layout)                      │
│                                                                    │
│  [Critical content] ◀─ Fast (above-the-fold)                     │
│                                                                    │
│  [Deferred content] ◀─ Lazy (heavy components)                   │
│                                                                    │
│  [User can interact immediately]                                  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      STREAMING ENGINE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   React     │───▶│  Streaming  │───▶│  Browser    │                 │
│  │   Server    │    │  Pipeline   │    │  Parser     │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│                            │                                             │
│                            ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    PRIORITY QUEUE                                  │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │  │
│  │  │Critical │  │  High   │  │ Normal  │  │   Low   │              │  │
│  │  │ (Shell) │  │(Content)│  │(Widgets)│  │(Deferred)│              │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Technologies

1. **React 18 `renderToPipeableStream`** - Native streaming support
2. **ReadableStream API** - Chunked transfer encoding
3. **Suspense Boundaries** - Component-level loading states
4. **Priority Queue** - Ordered content delivery

---

## Configuration

### Stream Configuration Interface

```typescript
interface StreamConfig {
  /**
   * Priority level for this stream boundary
   * - 'critical': Streamed immediately (shell, nav)
   * - 'high': Fast priority (above-the-fold content)
   * - 'normal': Standard priority (main content)
   * - 'low': Deferred (heavy components, analytics)
   */
  priority: 'critical' | 'high' | 'normal' | 'low';

  /**
   * Optional delay before streaming (milliseconds)
   * Useful for intentionally deferring non-critical content
   */
  deferMs?: number;

  /**
   * Placeholder component shown while streaming
   */
  placeholder?: React.ReactNode;

  /**
   * Callback when streaming starts for this boundary
   */
  onStreamStart?: () => void;

  /**
   * Callback when streaming completes for this boundary
   */
  onStreamComplete?: () => void;
}
```

### Basic Usage

```tsx
import { StreamBoundary } from '@/lib/streaming';

function App() {
  return (
    <div>
      {/* Critical: Streams immediately */}
      <StreamBoundary priority="critical">
        <Header />
        <Navigation />
      </StreamBoundary>

      {/* High: Above-the-fold content */}
      <StreamBoundary
        priority="high"
        placeholder={<HeroSkeleton />}
      >
        <HeroSection />
      </StreamBoundary>

      {/* Normal: Main content */}
      <StreamBoundary
        priority="normal"
        placeholder={<ContentSkeleton />}
      >
        <MainContent />
      </StreamBoundary>

      {/* Low: Heavy, deferred content */}
      <StreamBoundary
        priority="low"
        deferMs={100}
        placeholder={<ChartSkeleton />}
      >
        <HeavyCharts />
      </StreamBoundary>
    </div>
  );
}
```

---

## Stream Boundaries

### StreamBoundary Component

```tsx
import { StreamBoundary } from '@/lib/streaming';

interface StreamBoundaryProps {
  id?: string;
  children: React.ReactNode;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  deferMs?: number;
  placeholder?: React.ReactNode;
  onStreamStart?: () => void;
  onStreamComplete?: () => void;
  fallback?: React.ReactNode; // Error fallback
}

// Usage
<StreamBoundary
  id="dashboard-charts"
  priority="normal"
  placeholder={<LoadingSpinner />}
  onStreamComplete={() => console.log('Charts loaded')}
>
  <DashboardCharts />
</StreamBoundary>
```

### Nested Boundaries

Stream boundaries can be nested for granular control:

```tsx
<StreamBoundary priority="high" placeholder={<PageSkeleton />}>
  <PageHeader />

  <StreamBoundary priority="normal" placeholder={<ListSkeleton />}>
    <ProductList />
  </StreamBoundary>

  <StreamBoundary priority="low" placeholder={<SidebarSkeleton />}>
    <Sidebar />
  </StreamBoundary>
</StreamBoundary>
```

---

## Priority Levels

### Priority Queue System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PRIORITY LEVELS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CRITICAL (Level 1)                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  - Application shell                                             │   │
│  │  - Navigation and header                                         │   │
│  │  - Loading indicators                                            │   │
│  │  - Streamed: Immediately                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  HIGH (Level 2)                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  - Above-the-fold content                                        │   │
│  │  - Hero sections                                                 │   │
│  │  - Primary CTAs                                                  │   │
│  │  - Streamed: < 50ms                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  NORMAL (Level 3)                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  - Main content                                                  │   │
│  │  - Lists and tables                                              │   │
│  │  - Forms                                                         │   │
│  │  - Streamed: < 200ms                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  LOW (Level 4)                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  - Analytics widgets                                             │   │
│  │  - Heavy charts                                                  │   │
│  │  - Below-the-fold content                                        │   │
│  │  - Streamed: Deferred (100ms+)                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Configuring Priorities

```typescript
// Define custom priority thresholds
const streamingConfig = {
  priorities: {
    critical: {
      maxDelay: 0,
      timeout: 1000,
    },
    high: {
      maxDelay: 50,
      timeout: 2000,
    },
    normal: {
      maxDelay: 200,
      timeout: 5000,
    },
    low: {
      maxDelay: 500,
      timeout: 10000,
    },
  },
};
```

---

## Error Handling

### Error Boundaries with Streaming

```tsx
import { StreamBoundary, StreamErrorFallback } from '@/lib/streaming';

<StreamBoundary
  priority="normal"
  fallback={<StreamErrorFallback message="Failed to load content" />}
>
  <RiskyComponent />
</StreamBoundary>
```

### Custom Error Handling

```tsx
<StreamBoundary
  priority="normal"
  fallback={
    <div className="error-container">
      <h3>Something went wrong</h3>
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  }
  onStreamError={(error) => {
    // Log to error tracking
    captureException(error);
  }}
>
  <Content />
</StreamBoundary>
```

### Timeout Handling

```tsx
<StreamBoundary
  priority="normal"
  timeout={5000} // 5 second timeout
  timeoutFallback={
    <div>
      <p>Taking longer than expected...</p>
      <button onClick={retry}>Retry</button>
    </div>
  }
>
  <SlowComponent />
</StreamBoundary>
```

---

## Performance Considerations

### Measuring Streaming Performance

```typescript
import { StreamingMetrics } from '@/lib/streaming';

// Track streaming metrics
const metrics = new StreamingMetrics();

metrics.on('boundary:start', (id, priority) => {
  console.log(`Streaming ${id} (${priority})`);
});

metrics.on('boundary:complete', (id, duration) => {
  console.log(`Completed ${id} in ${duration}ms`);
});
```

### Optimizing Stream Chunks

```typescript
// Configure chunk size for optimal streaming
const streamConfig = {
  chunkSize: 16 * 1024, // 16KB chunks
  flushThreshold: 4 * 1024, // Flush at 4KB
  compressionEnabled: true,
};
```

### SEO Considerations

Streaming content is fully SEO-compatible:

```tsx
// Critical content is immediately available to crawlers
<StreamBoundary priority="critical">
  <Head>
    <title>Page Title</title>
    <meta name="description" content="..." />
  </Head>
  <MainContent />
</StreamBoundary>

// Deferred content is also crawlable (waits for complete)
<StreamBoundary priority="low">
  <SecondaryContent />
</StreamBoundary>
```

---

## Best Practices

### 1. Identify Critical Content

```tsx
// DO: Mark essential UI as critical
<StreamBoundary priority="critical">
  <AppShell />
</StreamBoundary>

// DON'T: Mark everything as critical
// This defeats the purpose of streaming
```

### 2. Use Meaningful Placeholders

```tsx
// DO: Match placeholder dimensions to content
<StreamBoundary
  priority="normal"
  placeholder={
    <div className="h-48 w-full animate-pulse bg-gray-200" />
  }
>
  <ProductCard />
</StreamBoundary>

// DON'T: Use generic loading spinners for all content
```

### 3. Group Related Content

```tsx
// DO: Group related components in same boundary
<StreamBoundary priority="normal">
  <ProductTitle />
  <ProductPrice />
  <ProductDescription />
</StreamBoundary>

// DON'T: Create too many small boundaries
// This adds overhead
```

### 4. Defer Heavy Operations

```tsx
// DO: Defer expensive components
<StreamBoundary priority="low" deferMs={100}>
  <AnalyticsDashboard />
  <RecommendationEngine />
</StreamBoundary>
```

### 5. Handle Loading States Gracefully

```tsx
// DO: Provide skeleton loaders that match layout
<StreamBoundary
  priority="normal"
  placeholder={<TableSkeleton rows={10} columns={5} />}
>
  <DataTable />
</StreamBoundary>
```

---

## Troubleshooting

### Content Not Streaming

**Symptom:** All content loads at once, no progressive rendering.

**Causes and Solutions:**

1. **Missing Suspense boundary:**
   ```tsx
   // Ensure StreamBoundary wraps async content
   <StreamBoundary priority="normal">
     <Suspense fallback={<Loading />}>
       <AsyncComponent />
     </Suspense>
   </StreamBoundary>
   ```

2. **Component not lazy-loaded:**
   ```tsx
   // Use lazy() for code splitting
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   ```

### Hydration Mismatch

**Symptom:** Console warnings about hydration mismatches.

**Solutions:**

1. **Ensure server/client consistency:**
   ```tsx
   // Use useId for stable IDs
   const id = useId();
   ```

2. **Defer client-only content:**
   ```tsx
   const [isClient, setIsClient] = useState(false);
   useEffect(() => setIsClient(true), []);

   {isClient && <ClientOnlyComponent />}
   ```

### Slow Streaming

**Symptom:** Streaming takes longer than expected.

**Solutions:**

1. **Check data fetching:**
   ```tsx
   // Ensure data is fetched in parallel
   const [data1, data2] = await Promise.all([
     fetch('/api/data1'),
     fetch('/api/data2'),
   ]);
   ```

2. **Optimize component rendering:**
   ```tsx
   // Memoize expensive computations
   const expensiveValue = useMemo(() => compute(data), [data]);
   ```

---

## API Reference

### StreamBoundary

```typescript
interface StreamBoundaryProps {
  id?: string;
  children: React.ReactNode;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  deferMs?: number;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  timeout?: number;
  timeoutFallback?: React.ReactNode;
  onStreamStart?: () => void;
  onStreamComplete?: () => void;
  onStreamError?: (error: Error) => void;
}
```

### useStreamingStatus

```typescript
function useStreamingStatus(): {
  isStreaming: boolean;
  completedBoundaries: string[];
  pendingBoundaries: string[];
};
```

### StreamingMetrics

```typescript
class StreamingMetrics {
  on(event: 'boundary:start', handler: (id: string, priority: string) => void): void;
  on(event: 'boundary:complete', handler: (id: string, duration: number) => void): void;
  on(event: 'boundary:error', handler: (id: string, error: Error) => void): void;
  getMetrics(): StreamingReport;
}
```

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Hydration Guide](./HYDRATION.md)
- [Performance Guide](./PERFORMANCE.md)
- [VDOM Guide](./VDOM.md)

---

<p align="center">
  <strong>Dynamic HTML Streaming</strong><br>
  Progressive rendering for faster perceived performance
</p>
