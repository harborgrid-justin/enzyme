# Performance Configuration

> Centralized performance thresholds, budgets, and monitoring configuration.

## Table of Contents

- [Overview](#overview)
- [Configuration Types](#configuration-types)
- [Core Web Vitals](#core-web-vitals)
- [Bundle Budgets](#bundle-budgets)
- [Runtime Budgets](#runtime-budgets)
- [Network Configuration](#network-configuration)
- [Environment-Specific Config](#environment-specific-config)
- [Helper Functions](#helper-functions)

## Overview

All performance configuration is centralized in `/src/config/performance.config.ts`. This includes Core Web Vitals thresholds, bundle budgets, runtime budgets, network quality tiers, and monitoring settings.

### Configuration Philosophy

- **Calibrated Values** - Based on Google's Core Web Vitals and industry best practices
- **Environment-Aware** - Different settings for dev, staging, and production
- **Type-Safe** - Full TypeScript support with documentation
- **Extensible** - Easy to customize for your needs

## Configuration Types

### PerformanceConfig

Main configuration interface:

```typescript
interface PerformanceConfig {
  readonly vitals: Record<string, VitalMetricThreshold>;
  readonly bundle: BundleBudget;
  readonly runtime: RuntimeBudget;
  readonly longTask: LongTaskConfig;
  readonly memory: MemoryConfig;
  readonly networkTiers: NetworkTierConfig[];
  readonly render: RenderConfig;
  readonly monitoring: MonitoringConfig;
}
```

### Getting Configuration

```typescript
import { getPerformanceConfig } from '@/config/performance.config';

const config = getPerformanceConfig();
// Returns environment-specific configuration
// - DEV_PERFORMANCE_CONFIG in development
// - STAGING_PERFORMANCE_CONFIG in staging
// - PROD_PERFORMANCE_CONFIG in production
```

## Core Web Vitals

### Vital Metric Thresholds

```typescript
interface VitalMetricThreshold {
  readonly good: number;
  readonly needsImprovement: number;
  readonly poor: number;
  readonly unit: 'ms' | 's' | 'score' | 'ratio';
  readonly description: string;
}
```

### Default Thresholds

```typescript
export const VITAL_THRESHOLDS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
    poor: 4000,
    unit: 'ms',
    description: 'Largest Contentful Paint - Time to render the largest visible element',
  },
  INP: {
    good: 200,
    needsImprovement: 500,
    poor: 500,
    unit: 'ms',
    description: 'Interaction to Next Paint - Responsiveness to user interactions',
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: 0.25,
    unit: 'score',
    description: 'Cumulative Layout Shift - Visual stability of the page',
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
    poor: 3000,
    unit: 'ms',
    description: 'First Contentful Paint - Time to first content render',
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
    poor: 1800,
    unit: 'ms',
    description: 'Time to First Byte - Server response time',
  },
};
```

### Checking Vital Threshold

```typescript
import { meetsVitalThreshold } from '@/config/performance.config';

const rating = meetsVitalThreshold('LCP', 2200);
// Returns: 'good' | 'needs-improvement' | 'poor'

console.log(rating); // 'good'
```

## Bundle Budgets

### Bundle Budget Configuration

```typescript
interface BundleBudget {
  readonly initial: number;        // Max initial bundle size (bytes)
  readonly asyncChunk: number;     // Max async chunk size (bytes)
  readonly vendor: number;         // Max vendor bundle size (bytes)
  readonly total: number;          // Max total app size (bytes)
  readonly warningThreshold: number; // Warn at X% of budget
}
```

### Default Bundle Budget

```typescript
export const BUNDLE_BUDGET: BundleBudget = {
  initial: 200 * 1024,      // 200 KB
  asyncChunk: 100 * 1024,   // 100 KB
  vendor: 150 * 1024,       // 150 KB
  total: 500 * 1024,        // 500 KB
  warningThreshold: 0.8,    // Warn at 80% of budget
};
```

**Rationale:**
- Initial bundle < 200KB ensures fast First Contentful Paint
- Async chunks < 100KB enables quick route transitions
- Total < 500KB keeps mobile data usage reasonable

### Calculating Budget Usage

```typescript
import { calculateBudgetUsage, formatBytes } from '@/config/performance.config';

const { usage, status } = calculateBudgetUsage(180000, 'initial');

console.log(`Usage: ${(usage * 100).toFixed(1)}%`); // "Usage: 90.0%"
console.log(`Status: ${status}`); // "ok" | "warning" | "exceeded"
console.log(`Size: ${formatBytes(180000)}`); // "175.78 KB"
```

## Runtime Budgets

### Runtime Budget Configuration

```typescript
interface RuntimeBudget {
  readonly jsExecutionPerFrame: number; // Max JS execution per frame (ms)
  readonly styleRecalc: number;         // Max style recalculation (ms)
  readonly layout: number;              // Max layout time (ms)
  readonly paint: number;               // Max paint time (ms)
  readonly composite: number;           // Max composite time (ms)
  readonly targetFps: number;           // Target frames per second
  readonly frameBudget: number;         // Frame budget (1000 / targetFps)
}
```

### Default Runtime Budget

```typescript
export const RUNTIME_BUDGET: RuntimeBudget = {
  jsExecutionPerFrame: 10,    // Leave 6ms for browser work
  styleRecalc: 2,
  layout: 2,
  paint: 2,
  composite: 1,
  targetFps: 60,
  frameBudget: 16.67,
};
```

**Based on RAIL Model:**
- **R**esponse: < 100ms for user input
- **A**nimation: 60fps = 16.67ms per frame
- **I**dle: Maximize idle time for background work
- **L**oad: < 1000ms for interactive

### Long Task Configuration

```typescript
interface LongTaskConfig {
  readonly threshold: number;             // Long task threshold (ms)
  readonly criticalThreshold: number;     // Critical long task (ms)
  readonly maxPerPageLoad: number;        // Max allowed per page
  readonly attributionSampleRate: number; // Sample rate (0-1)
  readonly historyBufferSize: number;     // History buffer size
}

export const LONG_TASK_CONFIG: LongTaskConfig = {
  threshold: 50,              // Tasks > 50ms are "long"
  criticalThreshold: 100,     // Tasks > 100ms are critical
  maxPerPageLoad: 10,         // Max 10 long tasks per page
  attributionSampleRate: 0.1, // Sample 10% for attribution
  historyBufferSize: 100,     // Keep last 100 tasks
};
```

## Memory Configuration

### Memory Config

```typescript
interface MemoryConfig {
  readonly warningThreshold: number;  // Warning at X% of heap
  readonly criticalThreshold: number; // Critical at X% of heap
  readonly pollingInterval: number;   // Poll interval (ms)
  readonly gcTriggerSize: number;     // GC trigger size (MB)
  readonly autoCleanup: boolean;      // Auto cleanup on pressure
}

export const MEMORY_CONFIG: MemoryConfig = {
  warningThreshold: 0.7,    // Warn at 70% of heap
  criticalThreshold: 0.9,   // Critical at 90% of heap
  pollingInterval: 5000,    // Check every 5 seconds
  gcTriggerSize: 100,       // Trigger cleanup at 100 MB
  autoCleanup: true,        // Auto cleanup enabled
};
```

**Note:** Chrome typically limits JS heap to ~4GB. These thresholds are calibrated for typical applications.

## Network Configuration

### Network Tier Configuration

```typescript
interface NetworkTierConfig {
  readonly name: string;
  readonly minRtt: number;              // Min RTT (ms)
  readonly maxRtt: number;              // Max RTT (ms)
  readonly minDownlink: number;         // Min downlink (Mbps)
  readonly prefetchStrategy: 'aggressive' | 'moderate' | 'conservative' | 'none';
  readonly imageQuality: 'high' | 'medium' | 'low' | 'placeholder';
}
```

### Network Tiers

```typescript
export const NETWORK_TIERS: NetworkTierConfig[] = [
  {
    name: '4g',
    minRtt: 0,
    maxRtt: 100,
    minDownlink: 10,
    prefetchStrategy: 'aggressive',
    imageQuality: 'high',
  },
  {
    name: '3g',
    minRtt: 100,
    maxRtt: 300,
    minDownlink: 1,
    prefetchStrategy: 'moderate',
    imageQuality: 'medium',
  },
  {
    name: 'slow-3g',
    minRtt: 300,
    maxRtt: 700,
    minDownlink: 0.4,
    prefetchStrategy: 'conservative',
    imageQuality: 'low',
  },
  {
    name: '2g',
    minRtt: 700,
    maxRtt: Infinity,
    minDownlink: 0,
    prefetchStrategy: 'none',
    imageQuality: 'placeholder',
  },
];
```

### Getting Network Tier

```typescript
import { getNetworkTier } from '@/config/performance.config';

const tier = getNetworkTier(
  150,  // RTT in ms
  5     // Downlink in Mbps
);

console.log(tier.name);              // '3g'
console.log(tier.prefetchStrategy);  // 'moderate'
console.log(tier.imageQuality);      // 'medium'
```

## Render Configuration

### Render Config

```typescript
interface RenderConfig {
  readonly maxComponentRenderTime: number;
  readonly slowComponentThreshold: number;
  readonly maxRerendersPerInteraction: number;
  readonly wastedRenderThreshold: number;
  readonly enableProdProfiling: boolean;
  readonly sampleRate: number;
}

export const RENDER_CONFIG: RenderConfig = {
  maxComponentRenderTime: 16,    // Max render time for 60fps
  slowComponentThreshold: 8,     // Flag components > 8ms
  maxRerendersPerInteraction: 5, // Max 5 rerenders per action
  wastedRenderThreshold: 2,      // Renders < 2ms considered wasted
  enableProdProfiling: false,    // Disabled in production
  sampleRate: 0.1,               // 10% sampling
};
```

## Monitoring Configuration

### Monitoring Config

```typescript
interface MonitoringConfig {
  readonly enabled: boolean;
  readonly endpoint: string;
  readonly batchSize: number;
  readonly flushInterval: number;
  readonly productionSampleRate: number;
  readonly includeAttribution: boolean;
  readonly debug: boolean;
}

export const MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  endpoint: '/api/analytics/performance',
  batchSize: 10,
  flushInterval: 30000,           // Flush every 30s
  productionSampleRate: 0.1,      // 10% sampling
  includeAttribution: true,
  debug: false,
};
```

## Environment-Specific Config

### Development Configuration

```typescript
export const DEV_PERFORMANCE_CONFIG: PerformanceConfig = {
  vitals: VITAL_THRESHOLDS,
  bundle: {
    ...BUNDLE_BUDGET,
    // Relax bundle limits in dev (source maps, HMR)
    initial: BUNDLE_BUDGET.initial * 3,
    total: BUNDLE_BUDGET.total * 3,
  },
  runtime: RUNTIME_BUDGET,
  longTask: {
    ...LONG_TASK_CONFIG,
    maxPerPageLoad: 50,            // More permissive
    attributionSampleRate: 1.0,    // Full attribution
  },
  memory: {
    ...MEMORY_CONFIG,
    pollingInterval: 10000,        // Less frequent polling
  },
  networkTiers: NETWORK_TIERS,
  render: {
    ...RENDER_CONFIG,
    enableProdProfiling: true,     // Always profile
    sampleRate: 1.0,               // Full sampling
  },
  monitoring: {
    ...MONITORING_CONFIG,
    debug: true,                   // Debug logging
    productionSampleRate: 1.0,
  },
};
```

### Production Configuration

```typescript
export const PROD_PERFORMANCE_CONFIG: PerformanceConfig = {
  vitals: VITAL_THRESHOLDS,
  bundle: BUNDLE_BUDGET,        // Strict budgets
  runtime: RUNTIME_BUDGET,
  longTask: LONG_TASK_CONFIG,
  memory: MEMORY_CONFIG,
  networkTiers: NETWORK_TIERS,
  render: RENDER_CONFIG,        // Profiling disabled
  monitoring: MONITORING_CONFIG, // 10% sampling
};
```

### Staging Configuration

```typescript
export const STAGING_PERFORMANCE_CONFIG: PerformanceConfig = {
  vitals: VITAL_THRESHOLDS,
  bundle: BUNDLE_BUDGET,
  runtime: RUNTIME_BUDGET,
  longTask: {
    ...LONG_TASK_CONFIG,
    attributionSampleRate: 0.5,  // 50% attribution
  },
  memory: MEMORY_CONFIG,
  networkTiers: NETWORK_TIERS,
  render: {
    ...RENDER_CONFIG,
    sampleRate: 0.5,             // 50% sampling
  },
  monitoring: {
    ...MONITORING_CONFIG,
    productionSampleRate: 0.5,   // 50% sampling
    debug: false,
  },
};
```

## Helper Functions

### formatBytes

Format bytes to human-readable string:

```typescript
import { formatBytes } from '@/config/performance.config';

formatBytes(0);         // "0 B"
formatBytes(1024);      // "1 KB"
formatBytes(1536);      // "1.5 KB"
formatBytes(1048576);   // "1 MB"
formatBytes(2097152);   // "2 MB"
```

### formatDuration

Format milliseconds to human-readable string:

```typescript
import { formatDuration } from '@/config/performance.config';

formatDuration(0.5);    // "500us"
formatDuration(10);     // "10ms"
formatDuration(1000);   // "1s"
formatDuration(1500);   // "1.5s"
```

### meetsVitalThreshold

Check if a value meets a vital threshold:

```typescript
import { meetsVitalThreshold } from '@/config/performance.config';

meetsVitalThreshold('LCP', 2000);   // 'good'
meetsVitalThreshold('LCP', 3500);   // 'needs-improvement'
meetsVitalThreshold('LCP', 4500);   // 'poor'

meetsVitalThreshold('CLS', 0.05);   // 'good'
meetsVitalThreshold('CLS', 0.15);   // 'needs-improvement'
meetsVitalThreshold('CLS', 0.30);   // 'poor'
```

### getNetworkTier

Get network tier based on conditions:

```typescript
import { getNetworkTier } from '@/config/performance.config';

const tier = getNetworkTier(
  80,   // RTT: 80ms
  15    // Downlink: 15 Mbps
);

console.log(tier.name);              // '4g'
console.log(tier.prefetchStrategy);  // 'aggressive'
```

### calculateBudgetUsage

Calculate bundle budget usage:

```typescript
import { calculateBudgetUsage } from '@/config/performance.config';

const result = calculateBudgetUsage(
  180000,   // 180 KB actual size
  'initial' // Budget type
);

console.log(result.usage);   // 0.9 (90%)
console.log(result.status);  // 'warning' (> 80% threshold)
```

## Custom Configuration

### Override in Development

```typescript
// custom-performance.config.ts
import { DEV_PERFORMANCE_CONFIG } from '@/config/performance.config';

export const customConfig = {
  ...DEV_PERFORMANCE_CONFIG,
  bundle: {
    ...DEV_PERFORMANCE_CONFIG.bundle,
    initial: 300 * 1024, // Custom 300 KB limit
  },
  render: {
    ...DEV_PERFORMANCE_CONFIG.render,
    slowComponentThreshold: 20, // More lenient
  },
};
```

### Use Custom Config

```typescript
import { getBudgetManager } from '@/lib/performance';
import { customConfig } from './custom-performance.config';

const budgetManager = getBudgetManager({
  budgets: customConfig.bundle,
});
```

## Best Practices

### 1. Use Environment-Specific Config

```typescript
// Good - uses getPerformanceConfig()
import { getPerformanceConfig } from '@/config/performance.config';

const config = getPerformanceConfig();
// Automatically returns correct config for environment

// Bad - hardcoded config
const config = PROD_PERFORMANCE_CONFIG;
// Always uses production config
```

### 2. Check Thresholds Consistently

```typescript
// Good - use helper function
import { meetsVitalThreshold } from '@/config/performance.config';

const rating = meetsVitalThreshold('LCP', value);

// Bad - manual checking
const rating = value <= 2500 ? 'good' :
               value <= 4000 ? 'needs-improvement' : 'poor';
```

### 3. Format Values for Display

```typescript
// Good - use formatters
import { formatBytes, formatDuration } from '@/config/performance.config';

console.log(`Size: ${formatBytes(size)}`);
console.log(`Duration: ${formatDuration(duration)}`);

// Bad - manual formatting
console.log(`Size: ${size} bytes`);
console.log(`Duration: ${duration}ms`);
```

### 4. Monitor Budget Usage

```typescript
import { calculateBudgetUsage } from '@/config/performance.config';

const { usage, status } = calculateBudgetUsage(bundleSize, 'initial');

if (status === 'warning') {
  console.warn(`Bundle at ${(usage * 100).toFixed(1)}%`);
}

if (status === 'exceeded') {
  console.error('Bundle budget exceeded!');
}
```

## Related Documentation

- [Performance Overview](./README.md)
- [Performance Observatory](./OBSERVATORY.md)
- [Bundle Optimization](./README.md#bundle-optimization)
