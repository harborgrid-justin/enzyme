# Virtual Modular DOM Guide

> **Modular DOM partitioning** - Independent module boundaries for efficient reconciliation, isolated hydration, and memory-optimized DOM pooling.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Module Boundaries](#module-boundaries)
4. [DOM Pooling](#dom-pooling)
5. [Module Hydration](#module-hydration)
6. [Security Features](#security-features)
7. [Configuration](#configuration)
8. [Usage Patterns](#usage-patterns)
9. [Performance Benefits](#performance-benefits)
10. [Best Practices](#best-practices)

---

## Overview

### The Problem

Standard React reconciliation processes the entire component tree:

```
┌──────────────────────────────────────────────────────────────────┐
│                    STANDARD RECONCILIATION                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Component Tree                        Full Diff                  │
│  ┌─────────────────┐                  ┌─────────────────┐        │
│  │      App        │                  │ Check ALL nodes │        │
│  │   ┌───────┐     │    ─────▶       │ ████████████████│        │
│  │   │Module │     │                  │ ████████████████│        │
│  │   │   A   │     │                  │ ████████████████│        │
│  │   └───────┘     │                  └─────────────────┘        │
│  │   ┌───────┐     │                                              │
│  │   │Module │     │                                              │
│  │   │   B   │     │    (Even if only Module A changed)          │
│  │   └───────┘     │                                              │
│  └─────────────────┘                                              │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Problems:**
- Full DOM reconciliation is expensive
- Large component trees cause memory pressure
- Hydration requires full DOM traversal
- Changes in one area affect the entire tree

### The Solution

Harbor React implements Virtual Modular DOM:

```
┌──────────────────────────────────────────────────────────────────┐
│                    MODULAR RECONCILIATION                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Module Boundaries                     Isolated Diffs             │
│  ┌─────────────────┐                  ┌─────────────────┐        │
│  │      App        │                  │                 │        │
│  │  ┌───────────┐  │                  │ ┌─────────────┐ │        │
│  │  │ Module A  │  │    ─────▶       │ │ Check A only│ │        │
│  │  │ (isolated)│  │                  │ │ █████████   │ │        │
│  │  └───────────┘  │                  │ └─────────────┘ │        │
│  │  ┌───────────┐  │                  │                 │        │
│  │  │ Module B  │  │                  │ (B unchanged,   │        │
│  │  │ (isolated)│  │                  │  not processed) │        │
│  │  └───────────┘  │                  │                 │        │
│  └─────────────────┘                  └─────────────────┘        │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Core Components

```typescript
interface VirtualModule {
  /**
   * Unique module identifier
   */
  id: string;

  /**
   * Module's DOM boundary
   */
  boundary: ModuleBoundary;

  /**
   * Virtual DOM nodes for this module
   */
  vdom: VirtualNode[];

  /**
   * Current hydration state
   */
  hydrationState: HydrationState;

  /**
   * Dependencies on other modules
   */
  dependencies: ModuleDependency[];
}

interface ModuleBoundary {
  /**
   * Root DOM element for this module
   */
  container: Element;

  /**
   * Named slots for child content
   */
  slots: Map<string, Slot>;

  /**
   * Portals belonging to this module
   */
  portals: Portal[];
}

interface VDOMPool {
  /**
   * Acquire a pooled virtual node
   */
  acquire(): VirtualNode;

  /**
   * Return node to pool
   */
  release(node: VirtualNode): void;

  /**
   * Garbage collect unused nodes
   */
  gc(): void;
}
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      VIRTUAL MODULAR DOM SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      MODULE REGISTRY                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │Module A │  │Module B │  │Module C │  │Module D │  ...       │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│  ┌───────────────────────────┼─────────────────────────────────────┐   │
│  │                    RECONCILIATION ENGINE                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │  Change         │  │  Module         │  │  DOM            │  │   │
│  │  │  Detection      │─▶│  Isolation      │─▶│  Updates        │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│  ┌───────────────────────────┼─────────────────────────────────────┐   │
│  │                    MEMORY MANAGEMENT                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │  VDOM Pool      │  │  Node Recycling │  │  GC Scheduler   │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Module Boundaries

### ModuleBoundary Component

```tsx
import { ModuleBoundary } from '@/lib/vdom';

function App() {
  return (
    <div>
      {/* Header module - isolated reconciliation */}
      <ModuleBoundary id="header" priority="high">
        <Header />
      </ModuleBoundary>

      {/* Main content module */}
      <ModuleBoundary id="main-content">
        <MainContent />
      </ModuleBoundary>

      {/* Sidebar module - independent updates */}
      <ModuleBoundary id="sidebar">
        <Sidebar />
      </ModuleBoundary>

      {/* Footer module - lazy hydration */}
      <ModuleBoundary id="footer" hydration="lazy">
        <Footer />
      </ModuleBoundary>
    </div>
  );
}
```

### Module Slots

Slots allow content injection while maintaining boundaries:

```tsx
import { ModuleBoundary, Slot } from '@/lib/vdom';

function LayoutModule() {
  return (
    <ModuleBoundary id="layout">
      <div className="layout">
        <header>
          <Slot name="header" />
        </header>

        <main>
          <Slot name="content" />
        </main>

        <aside>
          <Slot name="sidebar" />
        </aside>
      </div>
    </ModuleBoundary>
  );
}

function App() {
  return (
    <LayoutModule>
      <Slot.Content name="header">
        <Navigation />
      </Slot.Content>

      <Slot.Content name="content">
        <Dashboard />
      </Slot.Content>

      <Slot.Content name="sidebar">
        <QuickActions />
      </Slot.Content>
    </LayoutModule>
  );
}
```

### Nested Modules

Modules can be nested with proper boundary isolation:

```tsx
<ModuleBoundary id="dashboard">
  <DashboardHeader />

  {/* Nested module for charts */}
  <ModuleBoundary id="dashboard-charts" isolated>
    <ChartGrid />
  </ModuleBoundary>

  {/* Nested module for data table */}
  <ModuleBoundary id="dashboard-table" isolated>
    <DataTable />
  </ModuleBoundary>
</ModuleBoundary>
```

---

## DOM Pooling

### How DOM Pooling Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOM POOLING LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. ACQUISITION                                                          │
│  ┌─────────────────┐                                                    │
│  │  Component needs │───▶ Check pool ───▶ Node available? ───▶ Reuse  │
│  │  DOM node        │                           │                       │
│  └─────────────────┘                            ▼ No                    │
│                                           Create new node               │
│                                                                          │
│  2. USAGE                                                                │
│  ┌─────────────────┐                                                    │
│  │  Node in use    │ (normal React lifecycle)                          │
│  └─────────────────┘                                                    │
│                                                                          │
│  3. RELEASE                                                              │
│  ┌─────────────────┐                                                    │
│  │  Component      │───▶ Reset node ───▶ Return to pool                │
│  │  unmounts       │                                                    │
│  └─────────────────┘                                                    │
│                                                                          │
│  4. GARBAGE COLLECTION                                                   │
│  ┌─────────────────┐                                                    │
│  │  Pool overflow  │───▶ Remove excess ───▶ Free memory                │
│  │  or idle time   │                                                    │
│  └─────────────────┘                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Configuring DOM Pool

```typescript
import { configureDOMPool } from '@/lib/vdom';

configureDOMPool({
  // Maximum nodes per type to keep in pool
  maxPoolSize: 100,

  // Minimum nodes to keep warm
  minPoolSize: 10,

  // Types of nodes to pool
  pooledNodeTypes: ['div', 'span', 'li', 'tr', 'td'],

  // GC interval in ms
  gcInterval: 30000,

  // Enable debug logging
  debug: import.meta.env.DEV,
});
```

### Using Pooled Nodes

```tsx
import { usePooledNode } from '@/lib/vdom';

function ListItem({ item }) {
  // Automatically uses pooled nodes
  const { nodeRef, isPooled } = usePooledNode('li');

  return (
    <li ref={nodeRef} className="list-item">
      {item.name}
    </li>
  );
}
```

### Pool Statistics

```typescript
import { getDOMPoolStats } from '@/lib/vdom';

const stats = getDOMPoolStats();
// {
//   totalPooled: 45,
//   inUse: 30,
//   available: 15,
//   hitRate: 0.85,
//   missRate: 0.15,
//   gcRuns: 3,
// }
```

---

## Module Hydration

### Independent Module Hydration

Each module can hydrate independently:

```tsx
<ModuleBoundary
  id="comments"
  hydration={{
    strategy: 'lazy',     // lazy | eager | manual
    trigger: 'visible',   // visible | interaction | idle
    priority: 3,          // 1-5 (lower = higher priority)
  }}
>
  <CommentSection />
</ModuleBoundary>
```

### Hydration Strategies

```typescript
type HydrationStrategy =
  | 'eager'   // Hydrate immediately when JS loads
  | 'lazy'    // Hydrate when conditions met
  | 'manual'; // Only hydrate when explicitly triggered

type HydrationTrigger =
  | 'visible'     // When module enters viewport
  | 'interaction' // On user interaction
  | 'idle'        // During browser idle time
  | 'custom';     // Custom trigger function
```

### Manual Hydration Control

```tsx
import { useModuleHydration } from '@/lib/vdom';

function LazyModule() {
  const { isHydrated, hydrate, dehydrate } = useModuleHydration('lazy-module');

  return (
    <div>
      <button onClick={hydrate} disabled={isHydrated}>
        Load Module
      </button>

      <ModuleBoundary id="lazy-module" hydration="manual">
        <HeavyComponent />
      </ModuleBoundary>
    </div>
  );
}
```

---

## Security Features

### Module Sandboxing

```typescript
interface ModuleSandbox {
  /**
   * Isolate module execution
   */
  isolated: boolean;

  /**
   * Allowed DOM APIs
   */
  allowedAPIs: string[];

  /**
   * CSP nonce for inline scripts
   */
  cspNonce?: string;

  /**
   * XSS sanitization level
   */
  sanitization: 'strict' | 'standard' | 'none';
}
```

### Using Sandboxed Modules

```tsx
<ModuleBoundary
  id="user-content"
  sandbox={{
    isolated: true,
    allowedAPIs: ['fetch', 'localStorage'],
    sanitization: 'strict',
  }}
>
  <UserGeneratedContent />
</ModuleBoundary>
```

### Content Security Policy Integration

```tsx
import { ModuleBoundary, useCSPNonce } from '@/lib/vdom';

function SecureModule({ children }) {
  const nonce = useCSPNonce();

  return (
    <ModuleBoundary
      id="secure-module"
      sandbox={{
        cspNonce: nonce,
        sanitization: 'strict',
      }}
    >
      {children}
    </ModuleBoundary>
  );
}
```

### XSS Prevention at Boundaries

```tsx
<ModuleBoundary
  id="external-content"
  security={{
    // Sanitize HTML content
    sanitizeHTML: true,

    // Block inline event handlers
    blockInlineHandlers: true,

    // Validate URLs
    validateURLs: true,

    // Custom sanitizer
    customSanitizer: (html) => DOMPurify.sanitize(html),
  }}
>
  <ExternalWidget />
</ModuleBoundary>
```

---

## Configuration

### ModuleBoundary Props

```typescript
interface ModuleBoundaryProps {
  /**
   * Unique module identifier
   */
  id: string;

  /**
   * Module content
   */
  children: React.ReactNode;

  /**
   * Hydration configuration
   */
  hydration?: HydrationConfig | 'eager' | 'lazy' | 'manual';

  /**
   * Reconciliation priority
   */
  priority?: 'critical' | 'high' | 'normal' | 'low';

  /**
   * Fully isolate module (no context sharing)
   */
  isolated?: boolean;

  /**
   * Security sandbox configuration
   */
  sandbox?: ModuleSandbox;

  /**
   * Callbacks
   */
  onMount?: () => void;
  onUnmount?: () => void;
  onHydrate?: () => void;
  onError?: (error: Error) => void;
}
```

### Global VDOM Configuration

```typescript
import { configureVDOM } from '@/lib/vdom';

configureVDOM({
  // Module management
  modules: {
    maxConcurrentUpdates: 3,
    updateBatchSize: 10,
    reconciliationStrategy: 'incremental',
  },

  // DOM pooling
  pooling: {
    enabled: true,
    maxPoolSize: 100,
    gcInterval: 30000,
  },

  // Hydration
  hydration: {
    defaultStrategy: 'lazy',
    defaultTrigger: 'visible',
    timeout: 5000,
  },

  // Security
  security: {
    defaultSanitization: 'standard',
    enableCSP: true,
  },

  // Debug
  debug: import.meta.env.DEV,
});
```

---

## Usage Patterns

### Feature Module Pattern

```tsx
// features/dashboard/components/DashboardModule.tsx
import { ModuleBoundary } from '@/lib/vdom';

export function DashboardModule() {
  return (
    <ModuleBoundary
      id="feature-dashboard"
      priority="high"
      hydration="eager"
    >
      <DashboardLayout>
        {/* Nested modules for independent updates */}
        <ModuleBoundary id="dashboard-header">
          <DashboardHeader />
        </ModuleBoundary>

        <ModuleBoundary id="dashboard-metrics">
          <MetricsGrid />
        </ModuleBoundary>

        <ModuleBoundary id="dashboard-charts" hydration="lazy">
          <ChartsSection />
        </ModuleBoundary>
      </DashboardLayout>
    </ModuleBoundary>
  );
}
```

### Widget System

```tsx
// lib/widgets/WidgetContainer.tsx
import { ModuleBoundary } from '@/lib/vdom';

interface WidgetContainerProps {
  widgetId: string;
  children: React.ReactNode;
  lazy?: boolean;
}

export function WidgetContainer({
  widgetId,
  children,
  lazy = true,
}: WidgetContainerProps) {
  return (
    <ModuleBoundary
      id={`widget-${widgetId}`}
      hydration={lazy ? 'lazy' : 'eager'}
      isolated
      sandbox={{
        sanitization: 'strict',
      }}
    >
      <div className="widget-wrapper">
        {children}
      </div>
    </ModuleBoundary>
  );
}
```

### Dynamic Module Loading

```tsx
import { lazy } from 'react';
import { ModuleBoundary, loadModule } from '@/lib/vdom';

const LazyChart = lazy(() => import('./Chart'));

function DynamicChartModule({ chartId }) {
  return (
    <ModuleBoundary
      id={`chart-${chartId}`}
      hydration={{
        strategy: 'manual',
        loader: () => loadModule(`chart-${chartId}`),
      }}
    >
      <Suspense fallback={<ChartSkeleton />}>
        <LazyChart id={chartId} />
      </Suspense>
    </ModuleBoundary>
  );
}
```

---

## Performance Benefits

### Reconciliation Improvements

| Scenario | Standard | VDOM Modules | Improvement |
|----------|----------|--------------|-------------|
| Single component update | 100ms | 15ms | 85% faster |
| List re-render (100 items) | 250ms | 40ms | 84% faster |
| Full page with 10 modules | 500ms | 80ms | 84% faster |

### Memory Efficiency

```typescript
// Monitor VDOM memory usage
import { getVDOMMetrics } from '@/lib/vdom';

const metrics = getVDOMMetrics();
// {
//   totalModules: 12,
//   activeModules: 8,
//   pooledNodes: 45,
//   memoryUsage: '2.3 MB',
//   gcSavings: '1.1 MB',
// }
```

### Measuring Module Performance

```tsx
import { useModuleMetrics } from '@/lib/vdom';

function PerformanceMonitor({ moduleId }) {
  const metrics = useModuleMetrics(moduleId);

  return (
    <div>
      <p>Render count: {metrics.renderCount}</p>
      <p>Avg render time: {metrics.avgRenderTime}ms</p>
      <p>Last update: {metrics.lastUpdateTime}ms</p>
    </div>
  );
}
```

---

## Best Practices

### 1. Define Clear Module Boundaries

```tsx
// DO: Logical feature boundaries
<ModuleBoundary id="user-profile">
  <ProfileHeader />
  <ProfileContent />
  <ProfileActions />
</ModuleBoundary>

// DON'T: Arbitrary boundaries
<ModuleBoundary id="div-1">
  <SomeComponent />
</ModuleBoundary>
```

### 2. Use Appropriate Hydration Strategies

```tsx
// DO: Match strategy to content importance
<ModuleBoundary id="cta" hydration="eager">
  <BuyButton /> {/* Critical for conversion */}
</ModuleBoundary>

<ModuleBoundary id="reviews" hydration="lazy">
  <Reviews /> {/* Can wait */}
</ModuleBoundary>
```

### 3. Isolate Third-Party Content

```tsx
// DO: Sandbox external content
<ModuleBoundary
  id="external-widget"
  isolated
  sandbox={{ sanitization: 'strict' }}
>
  <ThirdPartyWidget />
</ModuleBoundary>
```

### 4. Monitor Module Performance

```tsx
// DO: Track module metrics
<ModuleBoundary
  id="heavy-module"
  onMount={() => performance.mark('module-mount')}
  onHydrate={() => performance.measure('module-hydration')}
>
  <HeavyComponent />
</ModuleBoundary>
```

### 5. Clean Up Resources

```tsx
// DO: Handle module cleanup
<ModuleBoundary
  id="subscription-module"
  onUnmount={() => {
    unsubscribe();
    clearCache();
  }}
>
  <SubscriptionContent />
</ModuleBoundary>
```

---

## API Reference

### Components

| Component | Description |
|-----------|-------------|
| `ModuleBoundary` | Creates isolated module boundary |
| `Slot` | Named slot for content injection |
| `Slot.Content` | Content provider for slots |

### Hooks

| Hook | Description |
|------|-------------|
| `useModuleHydration` | Control module hydration |
| `useModuleMetrics` | Monitor module performance |
| `usePooledNode` | Use pooled DOM nodes |
| `useCSPNonce` | Get CSP nonce |

### Functions

| Function | Description |
|----------|-------------|
| `configureVDOM` | Global configuration |
| `configureDOMPool` | Pool configuration |
| `getDOMPoolStats` | Pool statistics |
| `getVDOMMetrics` | VDOM metrics |
| `loadModule` | Dynamic module loading |

---

## Integration with Other Systems

### Progressive Hydration Integration

Combine VDOM module boundaries with progressive hydration:

```tsx
import { ModuleBoundary } from '@/lib/vdom';
import { HydrationBoundary } from '@/lib/hydration';

function ModularPage() {
  return (
    <div>
      {/* Each module hydrates independently */}
      <ModuleBoundary id="header">
        <HydrationBoundary priority="critical" trigger="immediate">
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

**Learn more:** [Auto-Prioritized Hydration](./hydration/STRATEGIES.md)

### Performance Monitoring Integration

Track VDOM reconciliation performance:

```tsx
import { ModuleBoundary } from '@/lib/vdom';
import { usePerformanceMonitor } from '@/lib/performance';

function MonitoredModule({ id, children }) {
  const { trackMetric } = usePerformanceMonitor();

  return (
    <ModuleBoundary
      id={id}
      onReconcile={(duration) => {
        trackMetric('vdom-reconciliation', { module: id, duration });
      }}
    >
      {children}
    </ModuleBoundary>
  );
}
```

**Learn more:** [Performance Monitoring](./performance/MONITORING.md)

### Streaming Integration

Stream VDOM modules progressively:

```tsx
import { ModuleBoundary } from '@/lib/vdom';
import { StreamBoundary } from '@/lib/streaming';

function StreamedModules() {
  return (
    <div>
      <StreamBoundary priority="critical">
        <ModuleBoundary id="shell">
          <Shell />
        </ModuleBoundary>
      </StreamBoundary>

      <StreamBoundary priority="high">
        <ModuleBoundary id="content">
          <Content />
        </ModuleBoundary>
      </StreamBoundary>
    </div>
  );
}
```

**Learn more:** [Dynamic HTML Streaming](./STREAMING.md)

## Related Documentation

### Core Systems

- [Hydration System](./hydration/README.md) - Progressive hydration
- [Auto-Prioritized Hydration](./hydration/STRATEGIES.md) - Hydration strategies
- [Streaming Guide](./STREAMING.md) - Progressive HTML streaming

### Performance

- [Performance System](./performance/README.md) - Complete performance monitoring
- [Web Vitals](./performance/WEB_VITALS.md) - Core Web Vitals optimization
- [Performance Monitoring](./performance/MONITORING.md) - Real-time monitoring
- [Render Tracking](./performance/RENDER_TRACKING.md) - Component performance

### Architecture

- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Security Guide](./SECURITY.md) - Security features
- [Template Performance](./PERFORMANCE.md) - Template-level optimization

---

<p align="center">
  <strong>Virtual Modular DOM</strong><br>
  Efficient reconciliation through modularity
</p>
