# Web Vitals Monitoring

> Comprehensive Core Web Vitals collection, tracking, and optimization for exceptional user experiences.

## Table of Contents

- [Overview](#overview)
- [Core Web Vitals](#core-web-vitals)
- [Vitals Collection](#vitals-collection)
- [Automatic Tracking](#automatic-tracking)
- [Custom Reporting](#custom-reporting)
- [Thresholds and Ratings](#thresholds-and-ratings)
- [Optimization Strategies](#optimization-strategies)
- [Analytics Integration](#analytics-integration)
- [Troubleshooting](#troubleshooting)

## Overview

Core Web Vitals are a set of metrics that Google uses to measure real-world user experience. Enzyme provides automatic collection and reporting of all Core Web Vitals with minimal performance overhead.

### Why Web Vitals Matter

- **SEO Impact**: Google uses Core Web Vitals as ranking signals
- **User Experience**: Better vitals correlate with lower bounce rates
- **Performance Insights**: Identify bottlenecks in real user sessions
- **Business Metrics**: Faster sites convert better

### Performance Targets

| Metric | Good | Needs Improvement | Poor | Description |
|--------|------|-------------------|------|-------------|
| **LCP** | ≤ 2.5s | 2.5s - 4.0s | > 4.0s | Largest Contentful Paint - Loading performance |
| **INP** | ≤ 200ms | 200ms - 500ms | > 500ms | Interaction to Next Paint - Interactivity |
| **CLS** | ≤ 0.1 | 0.1 - 0.25 | > 0.25 | Cumulative Layout Shift - Visual stability |
| **FCP** | ≤ 1.8s | 1.8s - 3.0s | > 3.0s | First Contentful Paint - Initial render |
| **TTFB** | ≤ 800ms | 800ms - 1.8s | > 1.8s | Time to First Byte - Server response |

## Core Web Vitals

### Largest Contentful Paint (LCP)

**What it measures:** Time until the largest content element becomes visible in the viewport.

**Common LCP Elements:**
- Hero images
- Background images
- Video thumbnails
- Large text blocks
- Full-width banners

**Target:** < 2.5 seconds

```typescript
import { initPerformanceMonitoring } from '@/lib/performance';

initPerformanceMonitoring({
  onVitalMetric: (metric) => {
    if (metric.name === 'LCP') {
      console.log(`LCP: ${metric.value}ms (${metric.rating})`);

      // Track LCP element
      if (metric.attribution?.lcpElement) {
        console.log('LCP element:', metric.attribution.lcpElement);
      }
    }
  }
});
```

### Interaction to Next Paint (INP)

**What it measures:** Responsiveness to user interactions throughout the page lifecycle.

**Interactions tracked:**
- Clicks
- Taps
- Keyboard inputs
- Other pointer interactions

**Target:** < 200 milliseconds

```typescript
import { useLongTaskDetector } from '@/lib/performance';

function App() {
  const { longTasks, totalBlockingTime } = useLongTaskDetector({
    threshold: 50, // Tasks > 50ms affect INP
    onLongTask: (task) => {
      console.warn(`Long task: ${task.duration}ms - May impact INP`);
    }
  });

  // Monitor and optimize INP
  useEffect(() => {
    if (totalBlockingTime > 300) {
      console.warn('High blocking time detected:', totalBlockingTime);
    }
  }, [totalBlockingTime]);
}
```

### Cumulative Layout Shift (CLS)

**What it measures:** Visual stability - unexpected layout shifts during page load.

**Common causes:**
- Images without dimensions
- Ads, embeds, iframes
- Dynamically injected content
- Web fonts causing FOIT/FOUT
- Actions waiting for network response

**Target:** < 0.1

```typescript
import { VitalsCollector } from '@/lib/performance';

const collector = new VitalsCollector({
  onVitalMetric: (metric) => {
    if (metric.name === 'CLS') {
      console.log(`CLS: ${metric.value} (${metric.rating})`);

      // Track shift sources
      if (metric.attribution?.largestShiftSource) {
        console.log('Largest shift:', metric.attribution.largestShiftSource);
      }
    }
  }
});
```

### First Contentful Paint (FCP)

**What it measures:** Time until first DOM content renders (text, image, SVG, or canvas).

**Target:** < 1.8 seconds

```typescript
// Optimize FCP with critical CSS
import { useCriticalCSS } from '@/lib/performance';

function App() {
  useCriticalCSS({
    extractFromComponents: ['Header', 'Hero', 'Navigation'],
    inlineThreshold: 14 * 1024, // 14KB inline threshold
  });
}
```

### Time to First Byte (TTFB)

**What it measures:** Time from navigation start to receiving first byte of response.

**Target:** < 800 milliseconds

```typescript
import { NetworkPerformanceAnalyzer } from '@/lib/performance';

const analyzer = new NetworkPerformanceAnalyzer({
  onSlowResponse: (entry) => {
    if (entry.responseStart > 800) {
      console.warn(`Slow TTFB: ${entry.responseStart}ms for ${entry.name}`);
    }
  }
});
```

## Vitals Collection

### Automatic Collection

Initialize vitals collection at app startup:

```typescript
import { initPerformanceMonitoring } from '@/lib/performance';

// Basic initialization
const cleanup = await initPerformanceMonitoring({
  debug: import.meta.env.DEV,
  reportToAnalytics: import.meta.env.PROD,
});

// Cleanup on unmount
window.addEventListener('beforeunload', cleanup);
```

### VitalsCollector API

For more control, use the VitalsCollector directly:

```typescript
import { VitalsCollector } from '@/lib/performance';

const collector = new VitalsCollector({
  // Budget thresholds
  budgets: {
    LCP: 2500,
    INP: 200,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 800,
  },

  // Callbacks
  onVitalMetric: (metric) => {
    console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
  },

  onBudgetViolation: (violation) => {
    console.error(`Budget violated: ${violation.metric}`);
  },

  // Sampling
  sampleRate: import.meta.env.PROD ? 0.1 : 1.0,

  // Debug mode
  debug: import.meta.env.DEV,
});

// Start collecting
collector.start();

// Get current snapshot
const snapshot = collector.getSnapshot();
console.log('Current vitals:', snapshot);

// Stop collecting
collector.stop();
```

## Automatic Tracking

### React Component Integration

```tsx
import { PerformanceProvider, usePerformanceObservatory } from '@/lib/performance';

function App() {
  return (
    <PerformanceProvider
      config={{
        collectVitals: true,
        reportToAnalytics: true,
        debug: import.meta.env.DEV,
      }}
    >
      <YourApp />

      {/* Development dashboard */}
      {import.meta.env.DEV && <PerformanceObservatory />}
    </PerformanceProvider>
  );
}

// Access vitals in components
function VitalsDisplay() {
  const { vitals } = usePerformanceObservatory();

  return (
    <div className="vitals">
      <Vital name="LCP" value={vitals.LCP} />
      <Vital name="INP" value={vitals.INP} />
      <Vital name="CLS" value={vitals.CLS} />
    </div>
  );
}
```

### Hook-Based Tracking

```tsx
import { useVitalsCollector } from '@/lib/performance';

function PerformanceMonitor() {
  const { vitals, isCollecting, overallScore } = useVitalsCollector({
    onMetric: (metric) => {
      // Send to analytics
      analytics.track('Web Vital', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
      });
    }
  });

  return (
    <div className="score">
      Performance Score: {overallScore}/100
    </div>
  );
}
```

## Custom Reporting

### Send to Google Analytics

```typescript
import { initPerformanceMonitoring } from '@/lib/performance';

initPerformanceMonitoring({
  onVitalMetric: (metric) => {
    // Google Analytics 4
    gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
      page_path: window.location.pathname,
    });
  }
});
```

### Send to Custom Endpoint

```typescript
import { VitalsCollector } from '@/lib/performance';

const collector = new VitalsCollector({
  reportToAnalytics: true,
  analyticsEndpoint: '/api/analytics/vitals',

  onVitalMetric: async (metric) => {
    await fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,

        // Context
        page: window.location.pathname,
        sessionId: getSessionId(),
        timestamp: Date.now(),

        // Attribution (if available)
        attribution: metric.attribution,

        // Device info
        deviceType: getDeviceType(),
        connectionType: navigator.connection?.effectiveType,
      })
    });
  }
});
```

### Batch Reporting

```typescript
import { RealUserMonitoring } from '@/lib/performance';

const rum = new RealUserMonitoring({
  // Batch vitals every 30 seconds
  batchInterval: 30000,

  // Max batch size
  maxBatchSize: 50,

  // Send on page visibility change
  reportOnVisibilityChange: true,

  onBatch: async (metrics) => {
    await fetch('/api/analytics/batch', {
      method: 'POST',
      body: JSON.stringify({
        metrics,
        session: getSessionInfo(),
      })
    });
  }
});
```

## Thresholds and Ratings

### Rating System

Each metric has three ratings:
- **Good**: Optimal user experience
- **Needs Improvement**: Acceptable but could be better
- **Poor**: Likely frustrating for users

```typescript
import { calculateRating } from '@/lib/performance';

// Get rating for a metric value
const lcpRating = calculateRating('LCP', 2800); // 'needs-improvement'
const inpRating = calculateRating('INP', 150); // 'good'
const clsRating = calculateRating('CLS', 0.15); // 'needs-improvement'
```

### Custom Thresholds

```typescript
import { VitalsCollector } from '@/lib/performance';

const collector = new VitalsCollector({
  // Custom thresholds
  thresholds: {
    LCP: {
      good: 2000,  // Stricter than default 2500ms
      poor: 3500,  // Stricter than default 4000ms
    },
    INP: {
      good: 150,   // Stricter than default 200ms
      poor: 400,   // Stricter than default 500ms
    },
    CLS: {
      good: 0.05,  // Stricter than default 0.1
      poor: 0.2,   // Stricter than default 0.25
    }
  }
});
```

## Optimization Strategies

### Improving LCP

**1. Optimize Images**

```tsx
import { useAdaptiveImageQuality } from '@/lib/performance';

function Hero({ src }) {
  const { quality } = useAdaptiveImageQuality({
    sizes: {
      high: `${src}-2x.jpg`,
      medium: `${src}-1x.jpg`,
      low: `${src}-thumb.jpg`,
    }
  });

  return (
    <img
      src={quality.src}
      loading="eager"  // Don't lazy load LCP image
      fetchPriority="high"
      decoding="async"
    />
  );
}
```

**2. Preload Critical Resources**

```tsx
import { preloadAsset } from '@/lib/performance';

function App() {
  useEffect(() => {
    // Preload LCP image
    preloadAsset('/hero-image.jpg', 'image', { fetchPriority: 'high' });

    // Preload critical fonts
    preloadAsset('/fonts/main.woff2', 'font', { crossOrigin: 'anonymous' });
  }, []);
}
```

**3. Use Critical CSS**

```tsx
import { CriticalCSSExtractor } from '@/lib/performance';

const extractor = new CriticalCSSExtractor({
  components: ['Header', 'Hero', 'AboveFold'],
  viewportHeight: 800,
  inlineThreshold: 14 * 1024,
});

const criticalCSS = await extractor.extract();
// Inject in <head>
```

### Improving INP

**1. Break Up Long Tasks**

```typescript
import { yieldToMain } from '@/lib/performance';

async function processLargeDataset(data: any[]) {
  for (let i = 0; i < data.length; i += 100) {
    // Process in chunks
    processChunk(data.slice(i, i + 100));

    // Yield to main thread every 100 items
    await yieldToMain();
  }
}
```

**2. Use Idle Callbacks**

```tsx
import { useIdleCallback } from '@/lib/performance';

function Component() {
  const runWhenIdle = useIdleCallback();

  const handleClick = () => {
    // Critical work immediately
    updateUI();

    // Non-critical work when idle
    runWhenIdle(() => {
      trackAnalytics();
      updateCache();
    });
  };
}
```

**3. Defer Non-Critical JavaScript**

```tsx
import { useDeferredRender } from '@/lib/performance';

function HeavyWidget() {
  const { shouldRender } = useDeferredRender({
    delay: 100,
    priority: 'low',
  });

  if (!shouldRender) {
    return <Skeleton />;
  }

  return <ExpensiveComponent />;
}
```

### Improving CLS

**1. Reserve Space for Dynamic Content**

```tsx
// ❌ Bad: No dimensions
<img src="/image.jpg" alt="Product" />

// ✅ Good: Explicit dimensions
<img
  src="/image.jpg"
  alt="Product"
  width={800}
  height={600}
  style={{ aspectRatio: '4/3' }}
/>
```

**2. Use CSS aspect-ratio**

```css
.image-container {
  aspect-ratio: 16 / 9;
  background-color: #f0f0f0;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**3. Avoid Inserting Content Above Existing Content**

```tsx
// ❌ Bad: Pushes content down
function Page() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetch('/api/banner').then(setBanner);
  }, []);

  return (
    <>
      {banner && <Banner />} {/* Causes layout shift */}
      <MainContent />
    </>
  );
}

// ✅ Good: Reserve space
function Page() {
  const [banner, setBanner] = useState(null);

  return (
    <>
      <div style={{ minHeight: banner ? 'auto' : '100px' }}>
        {banner && <Banner />}
      </div>
      <MainContent />
    </>
  );
}
```

## Analytics Integration

### Data Studio Dashboard

```typescript
// Export vitals for Data Studio
import { exportVitalsToDataStudio } from '@/lib/performance';

const collector = new VitalsCollector({
  onVitalMetric: (metric) => {
    exportVitalsToDataStudio({
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      page_path: window.location.pathname,
      device_category: getDeviceCategory(),
      connection_type: navigator.connection?.effectiveType,
      timestamp: new Date().toISOString(),
    });
  }
});
```

### Performance Monitoring Service

```typescript
import { PerformanceProfiler } from '@/lib/performance';

const profiler = new PerformanceProfiler({
  service: 'datadog', // or 'newrelic', 'sentry'
  apiKey: process.env.PERFORMANCE_API_KEY,

  onVitalMetric: (metric) => {
    // Automatically sent to monitoring service
  }
});
```

## Troubleshooting

### LCP Not Reporting

**Issue:** LCP metric not being collected

**Solutions:**
1. Check that content is actually rendered
2. Verify Performance Observer support
3. Ensure script runs after DOM ready
4. Check for CSP blocking Performance API

```typescript
// Debug LCP
const collector = new VitalsCollector({
  debug: true,
  onVitalMetric: (metric) => {
    if (metric.name === 'LCP') {
      console.log('LCP detected:', metric);
      console.log('LCP element:', metric.attribution?.lcpElement);
    }
  }
});
```

### INP Showing Poor Scores

**Issue:** High INP values

**Solutions:**
1. Identify long tasks with Long Task API
2. Break up JavaScript execution
3. Use `requestIdleCallback` for non-critical work
4. Implement code splitting

```typescript
import { useLongTaskDetector } from '@/lib/performance';

function App() {
  const { longTasks } = useLongTaskDetector({
    threshold: 50,
    onLongTask: (task) => {
      console.warn('Long task:', {
        duration: task.duration,
        startTime: task.startTime,
        attribution: task.attribution,
      });
    }
  });

  // Analyze long tasks in DevTools
  console.table(longTasks);
}
```

### CLS Issues

**Issue:** High Cumulative Layout Shift

**Solutions:**
1. Add width/height to images and iframes
2. Reserve space for dynamic content
3. Avoid inserting content above existing content
4. Use font-display: optional for web fonts

```typescript
import { VitalsCollector } from '@/lib/performance';

const collector = new VitalsCollector({
  debug: true,
  onVitalMetric: (metric) => {
    if (metric.name === 'CLS') {
      console.log('CLS sources:', metric.attribution?.largestShiftSources);
    }
  }
});
```

## Related Documentation

- [Performance Observatory](./OBSERVATORY.md) - Real-time performance dashboard
- [Performance Monitoring](./MONITORING.md) - Comprehensive monitoring system
- [Performance Budgets](./BUDGETS.md) - Budget enforcement and degradation
- [Render Tracking](./RENDER_TRACKING.md) - Component render performance
- [Performance Guide](../PERFORMANCE.md) - Template-level performance
- [Streaming Guide](../STREAMING.md) - Progressive HTML streaming
- [Hydration System](../hydration/README.md) - Progressive hydration

---

**Last Updated:** 2025-11-29
**Version:** 1.0.0
