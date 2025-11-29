# Performance Monitoring

> Real-time performance monitoring, metrics collection, and Real User Monitoring (RUM) for production applications.

## Table of Contents

- [Overview](#overview)
- [Performance Monitor](#performance-monitor)
- [Long Task Detection](#long-task-detection)
- [Memory Pressure Monitoring](#memory-pressure-monitoring)
- [Network Performance](#network-performance)
- [Frame Rate Monitoring](#frame-rate-monitoring)
- [Real User Monitoring (RUM)](#real-user-monitoring-rum)
- [Regression Detection](#regression-detection)
- [Custom Metrics](#custom-metrics)
- [Production Monitoring](#production-monitoring)

## Overview

Enzyme's performance monitoring system provides comprehensive real-time monitoring of application performance with minimal overhead. It tracks long tasks, memory pressure, network quality, frame rates, and custom metrics.

### Key Features

- **Long Task Detection**: Identify main thread blocking
- **Memory Monitoring**: Track heap usage and detect leaks
- **Network Analysis**: Monitor connection quality and request performance
- **Frame Rate Tracking**: Detect janky animations and scrolling
- **RUM System**: Real user monitoring with session tracking
- **Regression Detection**: Automatic performance regression alerts

## Performance Monitor

### Basic Setup

```typescript
import { PerformanceMonitor } from '@/lib/performance';

const monitor = new PerformanceMonitor({
  // What to monitor
  trackLongTasks: true,
  trackMemory: true,
  trackFrameRate: true,
  trackResources: true,

  // Thresholds
  longTaskThreshold: 50,  // ms
  lowFPSThreshold: 30,    // fps
  memoryThreshold: 0.8,   // 80% of limit

  // Callbacks
  onLongTask: (task) => {
    console.warn('Long task detected:', task.duration);
  },

  onMemoryPressure: (level) => {
    if (level === 'critical') {
      clearCaches();
    }
  },

  onLowFPS: (fps) => {
    console.warn('Low FPS:', fps);
  },

  // Debug mode
  debug: import.meta.env.DEV,
});

// Start monitoring
monitor.start();

// Get metrics snapshot
const metrics = monitor.getMetrics();
console.log('Current metrics:', metrics);

// Stop monitoring
monitor.stop();
```

### React Integration

```tsx
import { usePerformanceMonitor } from '@/lib/performance';

function App() {
  const {
    metrics,
    isMonitoring,
    longTasks,
    memoryUsage,
    fps,
  } = usePerformanceMonitor({
    enabled: true,
    sampleInterval: 1000, // Sample every second
  });

  return (
    <div>
      <YourApp />

      {import.meta.env.DEV && (
        <div className="debug-panel">
          <div>FPS: {fps}</div>
          <div>Memory: {(memoryUsage / 1024 / 1024).toFixed(2)} MB</div>
          <div>Long Tasks: {longTasks.length}</div>
        </div>
      )}
    </div>
  );
}
```

## Long Task Detection

### What Are Long Tasks?

Long tasks are JavaScript executions that block the main thread for more than 50ms, preventing the browser from responding to user input.

### Automatic Detection

```tsx
import { useLongTaskDetector } from '@/lib/performance';

function Component() {
  const {
    longTasks,
    totalBlockingTime,
    isBlocking,
    lastTask,
  } = useLongTaskDetector({
    threshold: 50, // Tasks > 50ms

    onLongTask: (task) => {
      console.warn('Long task detected:', {
        duration: task.duration,
        startTime: task.startTime,
        attribution: task.attribution,
      });

      // Report to analytics
      analytics.track('Long Task', {
        duration: task.duration,
        page: window.location.pathname,
      });
    },

    // Auto-track attribution
    trackAttribution: true,
  });

  // Show warning to users
  if (isBlocking) {
    return <PerformanceWarning />;
  }

  return <NormalContent />;
}
```

### Manual Task Tracking

```typescript
import { trackTask } from '@/lib/performance';

async function expensiveOperation() {
  const stopTracking = trackTask('data-processing');

  try {
    // Your expensive operation
    await processLargeDataset();
  } finally {
    const duration = stopTracking();
    console.log(`Task took ${duration}ms`);
  }
}
```

### Breaking Up Long Tasks

```typescript
import { yieldToMain, runInChunks } from '@/lib/performance';

// Option 1: Manual yielding
async function processData(items: any[]) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    // Yield every 100 items
    if (i % 100 === 0) {
      await yieldToMain();
    }
  }
}

// Option 2: Automatic chunking
async function processDataAutomatically(items: any[]) {
  await runInChunks(items, {
    chunkSize: 100,
    process: (item) => processItem(item),
    onProgress: (processed, total) => {
      console.log(`Progress: ${processed}/${total}`);
    },
  });
}
```

## Memory Pressure Monitoring

### Automatic Memory Monitoring

```tsx
import { useMemoryPressure } from '@/lib/performance';

function Component() {
  const {
    level,      // 'normal' | 'warning' | 'critical'
    usage,      // Percentage (0-100)
    limit,      // Total available memory
    trend,      // 'increasing' | 'stable' | 'decreasing'
    cleanup,    // Cleanup function
  } = useMemoryPressure({
    checkInterval: 5000, // Check every 5 seconds

    onPressure: (level) => {
      if (level === 'critical') {
        // Emergency cleanup
        cleanup();
      }
    },
  });

  // Adapt behavior to memory pressure
  const itemsToShow = level === 'critical' ? 10 :
                      level === 'warning' ? 50 : 100;

  return <ItemList items={items.slice(0, itemsToShow)} />;
}
```

### Memory Leak Detection

```typescript
import { MemoryGuardian } from '@/lib/performance';

const guardian = new MemoryGuardian({
  // Check for leaks every 30 seconds
  checkInterval: 30000,

  // Alert if growth > 5MB over 5 checks
  leakThreshold: {
    growth: 5 * 1024 * 1024,  // 5MB
    samples: 5,
  },

  onLeakDetected: (leak) => {
    console.error('Potential memory leak:', {
      growth: leak.growth,
      rate: leak.rate,
      samples: leak.samples,
    });

    // Send alert
    sendAlert('Memory leak detected', leak);
  },
});

guardian.start();
```

### Memory-Aware Caching

```tsx
import { useMemoryAwareCache } from '@/lib/performance';

function DataGrid({ data }) {
  const cache = useMemoryAwareCache({
    maxSize: 1000,         // Max 1000 entries
    maxMemory: 50 * 1024,  // Max 50KB
    evictionPolicy: 'lru',
    adaptToMemoryPressure: true,

    onEviction: (key, reason) => {
      console.log(`Evicted ${key}: ${reason}`);
    },
  });

  const getCachedItem = (id: string) => {
    return cache.get(id) || cache.set(id, computeItem(id));
  };

  return (
    <div>
      {data.map(item => (
        <Row key={item.id} data={getCachedItem(item.id)} />
      ))}
    </div>
  );
}
```

## Network Performance

### Network Quality Detection

```tsx
import { useNetworkQuality } from '@/lib/performance';

function Component() {
  const {
    effectiveType,    // '4g' | '3g' | '2g' | 'slow-2g'
    downlink,         // Mbps
    rtt,              // Round trip time (ms)
    saveData,         // User's data saver preference
    isSlowConnection,
    isOnline,
    quality,          // Computed quality score
  } = useNetworkQuality();

  // Adapt to network conditions
  if (isSlowConnection || saveData) {
    return <LowBandwidthVersion />;
  }

  return <FullVersion />;
}
```

### Network Request Tracking

```typescript
import { NetworkPerformanceAnalyzer } from '@/lib/performance';

const analyzer = new NetworkPerformanceAnalyzer({
  // Auto-monitor fetch and XHR
  autoMonitor: true,

  // Track slow requests
  slowThreshold: 1000, // 1 second

  onSlowRequest: (request) => {
    console.warn('Slow request:', {
      url: request.url,
      duration: request.duration,
      size: request.transferSize,
    });
  },

  // Track failed requests
  onRequestError: (error) => {
    console.error('Request failed:', error);
  },
});

// Get request statistics
const stats = analyzer.getStats();
console.log('Network stats:', {
  totalRequests: stats.totalRequests,
  averageDuration: stats.averageDuration,
  slowRequests: stats.slowRequests,
  failedRequests: stats.failedRequests,
});
```

### Adaptive Loading

```tsx
import { useAdaptiveLoading } from '@/lib/performance';

function MediaGallery() {
  const strategy = useAdaptiveLoading();
  // Returns: 'full' | 'reduced' | 'minimal' | 'offline'

  const loadStrategy = {
    full: {
      imageQuality: 'high',
      autoplay: true,
      prefetch: true,
    },
    reduced: {
      imageQuality: 'medium',
      autoplay: false,
      prefetch: false,
    },
    minimal: {
      imageQuality: 'low',
      autoplay: false,
      prefetch: false,
    },
    offline: {
      showCached: true,
    },
  }[strategy];

  return <Gallery {...loadStrategy} />;
}
```

## Frame Rate Monitoring

### FPS Tracking

```tsx
import { useFPSMonitor } from '@/lib/performance';

function AnimatedComponent() {
  const {
    fps,
    isJanky,
    averageFPS,
    minFPS,
    maxFPS,
  } = useFPSMonitor({
    targetFPS: 60,
    sampleSize: 60,  // Sample over 60 frames

    onJank: (fps) => {
      console.warn(`Janky frame: ${fps} FPS`);
    },
  });

  // Reduce animation complexity if janky
  const animationQuality = fps < 30 ? 'low' :
                          fps < 50 ? 'medium' : 'high';

  return <Animation quality={animationQuality} />;
}
```

### Frame Budget Management

```typescript
import { FrameBudgetManager } from '@/lib/performance';

const budgetManager = new FrameBudgetManager({
  targetFPS: 60,
  frameBudget: 16.67, // ms per frame at 60fps

  onBudgetExceeded: (frame) => {
    console.warn('Frame budget exceeded:', {
      duration: frame.duration,
      budget: frame.budget,
      overage: frame.overage,
    });
  },
});

// Track frame-heavy operations
budgetManager.trackFrame(() => {
  // Your rendering logic
  renderComplexUI();
});
```

## Real User Monitoring (RUM)

### RUM Setup

```typescript
import { RealUserMonitoring } from '@/lib/performance';

const rum = new RealUserMonitoring({
  // Session tracking
  sessionId: generateSessionId(),
  userId: getCurrentUserId(),

  // Data collection
  collectVitals: true,
  collectLongTasks: true,
  collectResources: true,
  collectErrors: true,

  // Sampling
  sampleRate: 0.1, // 10% of sessions

  // Reporting
  reportInterval: 30000,      // Report every 30 seconds
  batchSize: 50,              // Max 50 events per batch
  reportEndpoint: '/api/rum',

  // Callbacks
  onMetric: (metric) => {
    console.log('RUM metric:', metric);
  },

  onSession: (session) => {
    console.log('Session data:', session);
  },
});

// Start RUM
rum.start();

// Custom events
rum.trackEvent('feature_used', {
  feature: 'dashboard',
  duration: 1234,
});

// Page view tracking
rum.trackPageView({
  path: window.location.pathname,
  referrer: document.referrer,
});
```

### Session Replay Integration

```tsx
import { useRealUserMonitoring } from '@/lib/performance';

function App() {
  const { trackInteraction, trackError } = useRealUserMonitoring();

  const handleClick = (e) => {
    trackInteraction('button_click', {
      target: e.target.id,
      timestamp: Date.now(),
    });
  };

  useEffect(() => {
    // Track errors
    window.addEventListener('error', (e) => {
      trackError({
        message: e.message,
        stack: e.error?.stack,
        filename: e.filename,
        line: e.lineno,
      });
    });
  }, [trackError]);

  return <YourApp onClick={handleClick} />;
}
```

## Regression Detection

### Automatic Regression Detection

```typescript
import { RegressionDetector } from '@/lib/performance';

const detector = new RegressionDetector({
  // Baseline metrics
  baseline: {
    LCP: 2000,
    INP: 100,
    CLS: 0.05,
    TTI: 3000,
  },

  // Regression thresholds (% degradation)
  thresholds: {
    warning: 10,  // 10% slower
    critical: 25, // 25% slower
  },

  // Statistical significance
  minSamples: 30,
  confidenceLevel: 0.95,

  onRegression: (regression) => {
    console.error('Performance regression detected:', {
      metric: regression.metric,
      baseline: regression.baseline,
      current: regression.current,
      degradation: regression.degradation,
      significance: regression.significance,
    });

    // Alert team
    sendAlert(`Performance regression: ${regression.metric}`, regression);
  },
});

// Add metrics
detector.addMetric('LCP', 2300);
detector.addMetric('LCP', 2400);
// ...

// Check for regressions
const regressions = detector.detect();
```

### Continuous Performance Monitoring

```typescript
import { PerformanceProfiler } from '@/lib/performance';

const profiler = new PerformanceProfiler({
  // Profiling config
  sampleRate: 0.05, // 5% of sessions
  sampleInterval: 1000,

  // Baseline comparison
  compareToBaseline: true,
  baselineSource: '/api/performance/baseline',

  // Alert on regressions
  alertOnRegression: true,
  regressionThreshold: 0.15, // 15%

  onProfile: (profile) => {
    // Send to monitoring service
    sendToDatadog(profile);
  },
});

profiler.start();
```

## Custom Metrics

### Tracking Custom Metrics

```typescript
import { PerformanceMonitor } from '@/lib/performance';

const monitor = new PerformanceMonitor();

// Mark start
monitor.mark('feature-load-start');

// ... feature loading logic ...

// Mark end and measure
monitor.mark('feature-load-end');
const duration = monitor.measure(
  'feature-load',
  'feature-load-start',
  'feature-load-end'
);

console.log(`Feature loaded in ${duration}ms`);

// Get all measures
const measures = monitor.getMeasures();
console.log('All measures:', measures);
```

### Custom Metric Hook

```tsx
import { usePerformanceMetric } from '@/lib/performance';

function Component() {
  const { startMeasure, endMeasure, duration } = usePerformanceMetric('component-render');

  useEffect(() => {
    startMeasure();
    return () => {
      endMeasure();
      console.log(`Render took ${duration}ms`);
    };
  });

  return <div>Content</div>;
}
```

## Production Monitoring

### Production Configuration

```typescript
import { initPerformanceMonitoring } from '@/lib/performance';

// Production-optimized config
await initPerformanceMonitoring({
  // Enable monitoring
  enabled: true,

  // Sampling to reduce overhead
  sampleRate: 0.1, // 10% of users

  // What to collect
  collectVitals: true,
  collectLongTasks: true,
  collectMemory: false, // Disable in production
  collectResources: true,

  // Reporting
  reportToAnalytics: true,
  analyticsEndpoint: '/api/analytics/performance',
  batchInterval: 60000,  // Batch every minute
  maxBatchSize: 100,

  // Privacy
  anonymizeData: true,
  excludePII: true,

  // Error handling
  onError: (error) => {
    console.error('Performance monitoring error:', error);
    // Don't crash app
  },

  // Debug disabled
  debug: false,
});
```

### Monitoring Dashboard

```tsx
import { PerformanceObservatory } from '@/lib/performance';

function App() {
  return (
    <div>
      <YourApp />

      {/* Production monitoring dashboard (admin only) */}
      {isAdmin && (
        <PerformanceObservatory
          position="bottom-right"
          defaultCollapsed
          showVitals
          showLongTasks
          showMemory
          showNetwork
          enableExport
        />
      )}
    </div>
  );
}
```

### Alerts and Notifications

```typescript
import { PerformanceAlertManager } from '@/lib/performance';

const alertManager = new PerformanceAlertManager({
  // Alert rules
  rules: [
    {
      metric: 'LCP',
      condition: 'greater_than',
      threshold: 4000,
      severity: 'critical',
    },
    {
      metric: 'INP',
      condition: 'greater_than',
      threshold: 500,
      severity: 'warning',
    },
    {
      metric: 'error_rate',
      condition: 'greater_than',
      threshold: 0.05, // 5%
      severity: 'critical',
    },
  ],

  // Alert channels
  channels: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK,
      channel: '#performance-alerts',
    },
    email: {
      to: 'engineering@example.com',
      from: 'alerts@example.com',
    },
    pagerduty: {
      apiKey: process.env.PAGERDUTY_KEY,
    },
  },

  // Alert deduplication
  deduplicate: true,
  deduplicationWindow: 300000, // 5 minutes
});

alertManager.start();
```

## Related Documentation

- [Web Vitals](./WEB_VITALS.md) - Core Web Vitals collection
- [Performance Budgets](./BUDGETS.md) - Budget enforcement
- [Observatory Dashboard](./OBSERVATORY.md) - Real-time dashboard
- [Render Tracking](./RENDER_TRACKING.md) - Component performance
- [Lazy Loading](./LAZY_LOADING.md) - Resource optimization
- [Prefetching](./PREFETCHING.md) - Predictive prefetching
- [Streaming Guide](../STREAMING.md) - Progressive HTML streaming

---

**Last Updated:** 2025-11-29
**Version:** 1.0.0
