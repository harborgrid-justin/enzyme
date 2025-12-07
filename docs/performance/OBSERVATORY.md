# Performance Observatory

> Real-time performance monitoring dashboard component for development and debugging with Core Web Vitals visualization.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Components](#components)
- [Metrics Collection](#metrics-collection)
- [Web Vitals Tracking](#web-vitals-tracking)
- [Configuration](#configuration)
- [Examples](#examples)

## Overview

The Performance Observatory is a real-time performance dashboard that displays Core Web Vitals, resource timings, long tasks, and performance insights directly in your application during development.

### What It Shows

- **Core Web Vitals** - LCP, INP, CLS, FCP, TTFB with pass/fail indicators
- **Resource Breakdown** - Network requests by type and size
- **Long Tasks** - Main thread blocking tasks
- **Performance Score** - Overall performance rating (0-100)
- **Budget Violations** - Real-time budget status

## Features

- **Real-Time Updates** - Live metric collection and display
- **Visual Indicators** - Color-coded pass/fail/warning states
- **Minimal UI** - Collapsible, unobtrusive design
- **Development Only** - Auto-hidden in production (configurable)
- **Zero Config** - Works out of the box
- **Customizable** - Position, appearance, callbacks

## Quick Start

### Basic Setup

```tsx
import { PerformanceProvider, PerformanceObservatory } from '@/lib/performance';

function App() {
  return (
    <PerformanceProvider>
      <YourApp />

      {/* Add observatory */}
      <PerformanceObservatory />
    </PerformanceProvider>
  );
}
```

That's it! The observatory will appear in the bottom-right corner during development.

### With Configuration

```tsx
<PerformanceObservatory
  devOnly={true}           // Only show in development
  defaultCollapsed={true}  // Start collapsed
  position="bottom-right"  // Placement
  reportToAnalytics={false}
  debug={import.meta.env.DEV}
  zIndex={9999}
/>
```

## Components

### PerformanceProvider

Context provider that manages performance collection.

```tsx
interface PerformanceProviderProps {
  children: ReactNode;
  reportToAnalytics?: boolean;
  analyticsEndpoint?: string;
  sampleRate?: number;
  debug?: boolean;
  onMetric?: (metric: VitalMetricEntry, snapshot: VitalsSnapshot) => void;
  onViolation?: (violation: BudgetViolation) => void;
}
```

**Example:**

```tsx
<PerformanceProvider
  reportToAnalytics={import.meta.env.PROD}
  analyticsEndpoint="/api/analytics/performance"
  sampleRate={0.1}
  debug={import.meta.env.DEV}
  onMetric={(metric, snapshot) => {
    console.log(`${metric.name}: ${metric.value}${metric.unit}`);
  }}
  onViolation={(violation) => {
    console.warn(`Budget violation: ${violation.metric}`);
  }}
>
  <App />
</PerformanceProvider>
```

### PerformanceObservatory

The observatory dashboard component.

```tsx
interface PerformanceObservatoryProps {
  devOnly?: boolean;
  defaultCollapsed?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  reportToAnalytics?: boolean;
  analyticsEndpoint?: string;
  sampleRate?: number;
  debug?: boolean;
  zIndex?: number;
}
```

**Example:**

```tsx
<PerformanceObservatory
  devOnly
  position="bottom-right"
  defaultCollapsed={false}
  debug
  zIndex={10000}
/>
```

### usePerformanceObservatory

Hook to access performance context.

```tsx
interface PerformanceObservatoryContextValue {
  metrics: VitalMetricEntry[];
  recordMetric: (name: string, value: number) => void;
  clearMetrics: () => void;
  getMetric: (name: string) => VitalMetricEntry | undefined;
  getMetricsByName: (name: string) => VitalMetricEntry[];
  isObserving: boolean;
  startObserving: () => void;
  stopObserving: () => void;
}
```

**Example:**

```tsx
import { usePerformanceObservatory } from '@/lib/performance';

function MyComponent() {
  const { metrics, recordMetric, isObserving } = usePerformanceObservatory();

  useEffect(() => {
    // Record custom metric
    const start = performance.now();
    // ... expensive operation ...
    recordMetric('custom-operation', performance.now() - start);
  }, [recordMetric]);

  return <div>Observing: {isObserving}</div>;
}
```

## Metrics Collection

### Core Web Vitals

The observatory automatically collects all Core Web Vitals:

```typescript
const vitals = {
  LCP: {
    name: 'Largest Contentful Paint',
    target: '< 2.5s',
    importance: 'Critical for perceived load speed',
  },
  INP: {
    name: 'Interaction to Next Paint',
    target: '< 200ms',
    importance: 'Critical for responsiveness',
  },
  CLS: {
    name: 'Cumulative Layout Shift',
    target: '< 0.1',
    importance: 'Critical for visual stability',
  },
  FCP: {
    name: 'First Contentful Paint',
    target: '< 1.8s',
    importance: 'Important for initial render',
  },
  TTFB: {
    name: 'Time to First Byte',
    target: '< 800ms',
    importance: 'Important for server response',
  },
};
```

### Resource Metrics

Automatically collected resource statistics:

```typescript
interface ResourceStats {
  total: number;
  totalSize: number;
  totalDuration: number;
  byType: Record<string, {
    count: number;
    size: number;
    duration: number;
  }>;
  slowResources: PerformanceResourceTiming[];
}
```

### Long Tasks

Main thread blocking tasks > 50ms:

```typescript
interface LongTaskEntry {
  startTime: number;
  duration: number;
  name: string;
}
```

## Web Vitals Tracking

### Metric Collection

```tsx
<PerformanceProvider
  onMetric={(metric, snapshot) => {
    // Called for each vital metric
    console.log({
      name: metric.name,        // 'LCP', 'INP', etc.
      value: metric.value,      // Metric value
      rating: metric.rating,    // 'good', 'needs-improvement', 'poor'
      delta: metric.delta,      // Change from previous
      id: metric.id,           // Unique ID
      navigationType: metric.navigationType,
    });

    // Full snapshot
    console.log({
      score: snapshot.score,     // Overall score (0-100)
      rating: snapshot.rating,   // Overall rating
      LCP: snapshot.LCP,
      INP: snapshot.INP,
      CLS: snapshot.CLS,
      FCP: snapshot.FCP,
      TTFB: snapshot.TTFB,
    });
  }}
>
  <App />
</PerformanceProvider>
```

### Budget Violations

```tsx
<PerformanceProvider
  onViolation={(violation) => {
    console.warn({
      metric: violation.metric,      // Which metric
      value: violation.actualValue,  // Actual value
      budget: violation.budgetValue, // Budget threshold
      severity: violation.severity,  // 'warning' | 'critical'
      timestamp: violation.timestamp,
    });

    // Alert user or send to analytics
    if (violation.severity === 'critical') {
      analytics.track('performance-budget-violation', violation);
    }
  }}
>
  <App />
</PerformanceProvider>
```

## Configuration

### Position Options

```tsx
// Bottom right (default)
<PerformanceObservatory position="bottom-right" />

// Bottom left
<PerformanceObservatory position="bottom-left" />

// Top right
<PerformanceObservatory position="top-right" />

// Top left
<PerformanceObservatory position="top-left" />
```

### Development vs Production

```tsx
// Development only (recommended)
<PerformanceObservatory
  devOnly={true}
  debug={true}
  defaultCollapsed={false}
/>

// Production monitoring (with sampling)
<PerformanceObservatory
  devOnly={false}
  reportToAnalytics={true}
  sampleRate={0.1}  // 10% of users
  defaultCollapsed={true}
/>
```

### Custom Analytics

```tsx
<PerformanceProvider
  reportToAnalytics={true}
  analyticsEndpoint="/api/performance"
  onMetric={(metric, snapshot) => {
    // Custom analytics
    fetch('/api/custom-analytics', {
      method: 'POST',
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });
  }}
>
  <App />
</PerformanceProvider>
```

## Examples

### Basic Usage

```tsx
import { PerformanceProvider, PerformanceObservatory } from '@/lib/performance';

export default function App() {
  return (
    <PerformanceProvider>
      <Router>
        <Routes />
      </Router>

      <PerformanceObservatory />
    </PerformanceProvider>
  );
}
```

### With Custom Callbacks

```tsx
function App() {
  const handleMetric = (metric: VitalMetricEntry) => {
    // Log poor metrics
    if (metric.rating === 'poor') {
      console.error(`Poor ${metric.name}: ${metric.value}`);
    }
  };

  const handleViolation = (violation: BudgetViolation) => {
    // Send to monitoring service
    monitoring.trackViolation(violation);
  };

  return (
    <PerformanceProvider
      onMetric={handleMetric}
      onViolation={handleViolation}
    >
      <YourApp />
      <PerformanceObservatory />
    </PerformanceProvider>
  );
}
```

### Production Monitoring

```tsx
function App() {
  return (
    <PerformanceProvider
      reportToAnalytics={import.meta.env.PROD}
      analyticsEndpoint="/api/analytics/performance"
      sampleRate={import.meta.env.PROD ? 0.1 : 1.0}
      onMetric={(metric, snapshot) => {
        // Custom tracking
        if (import.meta.env.PROD && Math.random() < 0.1) {
          analytics.track('web-vital', {
            metric: metric.name,
            value: metric.value,
            rating: metric.rating,
            score: snapshot.score,
          });
        }
      }}
    >
      <YourApp />

      {/* Show in dev only */}
      <PerformanceObservatory devOnly />
    </PerformanceProvider>
  );
}
```

### Custom Metrics

```tsx
function CustomMetrics() {
  const { recordMetric } = usePerformanceObservatory();

  useEffect(() => {
    // Track component mount time
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      recordMetric('component-lifetime', duration);
    };
  }, [recordMetric]);

  const handleClick = () => {
    // Track interaction time
    const start = performance.now();

    performAction().then(() => {
      recordMetric('action-duration', performance.now() - start);
    });
  };

  return <button onClick={handleClick}>Action</button>;
}
```

### Conditional Display

```tsx
function App() {
  const [showObservatory, setShowObservatory] = useState(false);

  useEffect(() => {
    // Show on Ctrl+Shift+P
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShowObservatory(prev => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <PerformanceProvider>
      <YourApp />

      {showObservatory && (
        <PerformanceObservatory
          devOnly={false}
          defaultCollapsed={false}
        />
      )}
    </PerformanceProvider>
  );
}
```

## Visual Indicators

### Score Display

```
┌─────────┐
│   92    │  Green (90-100): Excellent
│ ─────── │  Yellow (50-89): Needs work
│   Good  │  Red (0-49): Poor
└─────────┘
```

### Metric Gauges

```
LCP: 2.1s           ████████░░  Pass ✓
INP: 180ms          ██████████  Pass ✓
CLS: 0.05           ██████████  Pass ✓
FCP: 1.5s           ████████░░  Pass ✓
TTFB: 750ms         ████████░░  Pass ✓
```

### Resource Breakdown

```
Resources (42)
Total: 1.2 MB

script    12    450 KB
stylesheet 5    200 KB
image     15    400 KB
font       4    120 KB
other      6     30 KB
```

### Long Tasks

```
Long Tasks (3)

 156ms  at 1234ms
  89ms  at 2456ms
  67ms  at 3678ms
```

## Best Practices

### 1. Use During Development

```tsx
// Always enable in development
<PerformanceObservatory
  devOnly={import.meta.env.DEV}
  defaultCollapsed={false}
  debug={import.meta.env.DEV}
/>
```

### 2. Monitor Critical Pages

```tsx
// Enable on specific routes
function App() {
  const location = useLocation();
  const showObservatory = ['/dashboard', '/checkout'].includes(location.pathname);

  return (
    <PerformanceProvider>
      <Routes />
      {showObservatory && <PerformanceObservatory />}
    </PerformanceProvider>
  );
}
```

### 3. Set Up Alerts

```tsx
<PerformanceProvider
  onMetric={(metric) => {
    // Alert on poor vitals
    if (metric.rating === 'poor') {
      notify.error(`Poor ${metric.name}: ${metric.value}`);
    }
  }}
  onViolation={(violation) => {
    // Alert on budget violations
    if (violation.severity === 'critical') {
      notify.error(`Budget exceeded: ${violation.metric}`);
    }
  }}
>
  <App />
</PerformanceProvider>
```

### 4. Sample in Production

```tsx
// Collect data from subset of users
<PerformanceProvider
  reportToAnalytics={import.meta.env.PROD}
  sampleRate={0.1}  // 10% sampling
  onMetric={(metric) => {
    // Send to analytics
    analytics.track('web-vital', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
    });
  }}
>
  <App />
</PerformanceProvider>
```

### 5. Export Data

```tsx
function ExportButton() {
  const { metrics } = usePerformanceObservatory();

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: metrics,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-${Date.now()}.json`;
    a.click();
  };

  return <button onClick={exportData}>Export Performance Data</button>;
}
```

## Troubleshooting

### Observatory Not Showing

```tsx
// Check these common issues:

// 1. Wrapped with provider?
<PerformanceProvider>
  <App />
  <PerformanceObservatory />  {/* Must be inside provider */}
</PerformanceProvider>

// 2. Dev only mode?
<PerformanceObservatory
  devOnly={false}  // Set to false to always show
/>

// 3. Z-index conflict?
<PerformanceObservatory
  zIndex={99999}  // Increase if hidden
/>
```

### Metrics Not Updating

```tsx
// Ensure provider is initialized
<PerformanceProvider
  debug={true}  // Enable logging
>
  <App />
</PerformanceProvider>

// Check console for:
// "VitalsCollector initialized"
// "Metric collected: LCP"
```

### High Memory Usage

```tsx
// Limit metric history
const tracker = getVitalsCollector({
  maxHistorySize: 100,  // Reduce from default
});

// Clear periodically
useEffect(() => {
  const interval = setInterval(() => {
    tracker.clearHistory();
  }, 60000);  // Every minute

  return () => clearInterval(interval);
}, []);
```

## Related Documentation

### Performance System
- [README.md](./README.md) - Performance overview
- [WEB_VITALS.md](./WEB_VITALS.md) - Core Web Vitals
- [MONITORING.md](./MONITORING.md) - Performance monitoring
- [RENDER_TRACKING.md](./RENDER_TRACKING.md) - Render tracking
- [CONFIG.md](./CONFIG.md) - Performance configuration

### Monitoring & Hydration
- [Monitoring System](../monitoring/README.md) - System monitoring
- [Error Boundaries](../monitoring/ERROR_BOUNDARIES.md) - Error tracking
- [Hydration System](../hydration/README.md) - Hydration monitoring

### Integration
- [Performance Integration](../integration/PERFORMANCE_MONITORING_HYDRATION.md) - Complete integration
